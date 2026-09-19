#!/usr/bin/env python3
"""
Python script to backfill full historical daily prices from inception for all START_GAP stocks.
"""

import os
import sys
import time
from datetime import datetime, timezone
import requests
import psycopg2
from psycopg2.extras import execute_values

BATCH_CHUNK_SIZE = 500
INTER_REQUEST_DELAY_SEC = 0.2

START_GAP_STOCKS = [
    # Zerodha
    {"source": "zerodha", "ticker": "IDFCFIRSTB.NS", "name": "IDFCFIRSTB"},
    {"source": "zerodha", "ticker": "PNB.NS", "name": "PNB"},
    {"source": "zerodha", "ticker": "RELIANCE.NS", "name": "RELIANCE"},
    {"source": "zerodha", "ticker": "NHPC.NS", "name": "NHPC"},
    {"source": "zerodha", "ticker": "NTPC.NS", "name": "NTPC"},
    {"source": "zerodha", "ticker": "TMPV.NS", "name": "TMPV"},
    {"source": "zerodha", "ticker": "ONGC.NS", "name": "ONGC"},

    # MSFL
    {"source": "msfl", "ticker": "ASHOKLEY.NS", "name": "ASHOKLEY"},
    {"source": "msfl", "ticker": "GUJENERGY.NS", "name": "GUJENERGY"},
    {"source": "msfl", "ticker": "HOCL.BO", "name": "HOCL"},
    {"source": "msfl", "ticker": "JSWSTEEL.NS", "name": "JSWSTEEL"},
    {"source": "msfl", "ticker": "NHPC.NS", "name": "NHPC"},
    {"source": "msfl", "ticker": "NTPC.NS", "name": "NTPC"},
    {"source": "msfl", "ticker": "RELIANCE.NS", "name": "RELIANCE"},
    {"source": "msfl", "ticker": "RPOWER.NS", "name": "RPOWER"},
    {"source": "msfl", "ticker": "TTML.NS", "name": "TTML"},
    {"source": "msfl", "ticker": "BIBCL.BO", "name": "BIBCL"},
    {"source": "msfl", "ticker": "GVFILM.BO", "name": "GVFILM"},
    {"source": "msfl", "ticker": "KOHINOOR.NS", "name": "KOHINOOR"},

    # Watchlist
    {"source": "watchlist", "ticker": "WELCORP.NS", "name": "WELSPUN CORP LIMITED"},
    {"source": "watchlist", "ticker": "KIRLOSENG.NS", "name": "KIRLOSKAR OIL ENG LTD"},
    {"source": "watchlist", "ticker": "WELSPUNLIV.NS", "name": "WELSPUN LIVING LIMITED"},
]

def get_db_connection():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    db_url = None
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    db_url = line.strip().split("=", 1)[1].strip("\"'")
                    break
    if not db_url:
        db_url = os.environ.get("DATABASE_URL")
    
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is missing.")
    
    base_url = db_url.split("?")[0]
    return psycopg2.connect(base_url)

def format_ist_date(ts_sec):
    dt = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
    return dt.strftime("%d-%m-%Y")

def fetch_yahoo_stock_history(ticker):
    now_sec = int(time.time())
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?period1=0&period2={now_sec}&interval=1d"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    for attempt in range(3):
        try:
            r = requests.get(url, headers=headers, timeout=25)
            if r.status_code == 200:
                res = r.json().get("chart", {}).get("result", [])
                if not res:
                    return None
                result = res[0]
                timestamps = result.get("timestamp", [])
                quotes = result.get("indicators", {}).get("quote", [{}])[0]
                closes = quotes.get("close", [])
                highs = quotes.get("high", [])

                data_map = {}
                for i in range(len(timestamps)):
                    ts = timestamps[i]
                    close = closes[i] if i < len(closes) else None
                    high = highs[i] if i < len(highs) else None
                    p = close if close is not None else high
                    if p is not None and ts:
                        d_str = format_ist_date(ts)
                        data_map[d_str] = round(float(p), 2)

                rows = []
                for d_str, price in data_map.items():
                    rows.append({"date": d_str, "nav": price})

                # Sort descending
                rows.sort(key=lambda x: datetime.strptime(x["date"], "%d-%m-%Y"), reverse=True)
                return rows
        except Exception:
            time.sleep(1.0)
    return None

def backfill_stock(conn, item):
    source = item["source"]
    ticker = item["ticker"]
    name = item["name"]

    print(f"\nFetching full max history for [{source.upper()}] {ticker} ({name})...")
    history_rows = fetch_yahoo_stock_history(ticker)

    if not history_rows:
        return {"success": False, "points": 0, "error": "No data from Yahoo Finance"}

    # Sort ascending for earliest date
    sorted_asc = sorted(history_rows, key=lambda x: datetime.strptime(x["date"], "%d-%m-%Y"))
    earliest_date = datetime.strptime(sorted_asc[0]["date"], "%d-%m-%Y").strftime("%Y-%m-%d")
    latest_date = datetime.strptime(sorted_asc[-1]["date"], "%d-%m-%Y").strftime("%Y-%m-%d")
    now_iso = datetime.now(timezone.utc).isoformat()

    print(f"  -> Fetched {len(history_rows)} daily points [{earliest_date} .. {latest_date}]")

    with conn.cursor() as cur:
        if source == "zerodha":
            cur.execute("""
                INSERT INTO portfolio.zerodha_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, launch_date, last_fetched_at)
                VALUES (%s, 'Equity', 'Equity', 'Stock', %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    launch_date = EXCLUDED.launch_date,
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (ticker, name, earliest_date, now_iso))

            query = """
                INSERT INTO portfolio.zerodha_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history_rows), BATCH_CHUNK_SIZE):
                chunk = [(ticker, r["date"], r["nav"], now_iso) for r in history_rows[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, query, chunk)

        elif source == "msfl":
            cur.execute("""
                INSERT INTO portfolio.msfl_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, launch_date, last_fetched_at)
                VALUES (%s, 'Equity', 'Equity', 'Stock', %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    launch_date = EXCLUDED.launch_date,
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (ticker, name, earliest_date, now_iso))

            query = """
                INSERT INTO portfolio.msfl_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history_rows), BATCH_CHUNK_SIZE):
                chunk = [(ticker, r["date"], r["nav"], now_iso) for r in history_rows[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, query, chunk)

        elif source == "watchlist":
            cur.execute("""
                INSERT INTO portfolio.watchlist_scheme_nav_cache_meta 
                (scheme_code, fund_house, category, scheme_name, first_nav_date, last_fetched_at)
                VALUES (%s, 'Equity', 'Stock', %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    first_nav_date = EXCLUDED.first_nav_date,
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (ticker, name, earliest_date, now_iso))

            cur.execute("UPDATE portfolio.watchlist_schemes SET launch_date = %s WHERE scheme_code = %s;", (earliest_date, ticker))

            query = """
                INSERT INTO portfolio.watchlist_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history_rows), BATCH_CHUNK_SIZE):
                chunk = [(ticker, r["date"], r["nav"], now_iso) for r in history_rows[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, query, chunk)

        conn.commit()

    return {"success": True, "points": len(history_rows), "earliest_date": earliest_date, "latest_date": latest_date}

def main():
    print("=========================================================================")
    print("       BACKFILLING START GAP HISTORICAL NAVS FOR 22 STOCKS (PYTHON)      ")
    print("=========================================================================")

    conn = get_db_connection()
    success_count = 0
    fail_count = 0
    total_rows = 0

    try:
        for idx, item in enumerate(START_GAP_STOCKS):
            if idx > 0:
                time.sleep(INTER_REQUEST_DELAY_SEC)

            try:
                res = backfill_stock(conn, item)
                if res["success"]:
                    success_count += 1
                    total_rows += res["points"]
                    print(
                        f"  \033[32m✔ [{idx + 1}/{len(START_GAP_STOCKS)}] Success: {item['ticker']} -> {res['points']} points [{res['earliest_date']} .. {res['latest_date']}]\033[0m"
                    )
                else:
                    fail_count += 1
                    print(
                        f"  \033[31m✖ [{idx + 1}/{len(START_GAP_STOCKS)}] Failed: {item['ticker']} ({res.get('error')})\033[0m"
                    )
            except Exception as e:
                fail_count += 1
                conn.rollback()
                print(f"  \033[31m✖ Error processing {item['ticker']}:\033[0m {e}")

        print("\n=========================================================================")
        print("                          BACKFILL COMPLETE                              ")
        print("=========================================================================")
        print(f" Successfully Backfilled: {success_count}/{len(START_GAP_STOCKS)}")
        print(f" Failed:                  {fail_count}")
        print(f" Total NAV Rows Upserted: {total_rows:,}")
        print("=========================================================================\n")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
