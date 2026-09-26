#!/usr/bin/env python3
"""
Sync Inception Dates & Historical NAV Engine for Newly Added/Mapped MF, SIF, and Stocks.

Finds any Mutual Funds, SIFs, Listed Stocks, ETFs, or Unlisted Stocks across Core,
Zerodha, MSFL, Watchlist, and Benchmarks that are missing inception/launch dates or
lack full historical daily NAV/price coverage. Automatically resolves true inception
dates, saves them into the database, and backfills complete daily history from inception
day until today.

Usage:
  python3 scripts/sync_inception_nav.py --dry-run
  python3 scripts/sync_inception_nav.py --live
  python3 scripts/sync_inception_nav.py --live --code=151750
  python3 scripts/sync_inception_nav.py --live --code=WAAREEENER.NS
  python3 scripts/sync_inception_nav.py --live --source=zerodha
"""

import os
import sys
import re
import time
import argparse
from datetime import datetime, timezone
import requests
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

# ANSI Terminal Colors
CLR_RESET = "\033[0m"
CLR_BOLD = "\033[1m"
CLR_GREEN = "\033[32m"
CLR_CYAN = "\033[36m"
CLR_YELLOW = "\033[33m"
CLR_RED = "\033[31m"
CLR_MAGENTA = "\033[35m"
CLR_BLUE = "\033[34m"

DEFAULT_DELAY_MS = 150
BATCH_CHUNK_SIZE = 500
DEFAULT_BENCHMARK_CODE = "120716"
DEFAULT_BENCHMARK_NAME = "UTI Nifty 50 Index Fund Direct Growth"

UNLISTED_STOCKS = {
    "SEPC", "532945", "532454", "532847", "532467", "532832", "532890", "539574",
    "NEPC", "KOHINOOR", "BELLARY", "SCL-X", "SCL"
}

MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
AMFI_MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}

def log_header(text):
    print(f"\n{CLR_BOLD}{CLR_CYAN}======================================================================{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}  {text}{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}======================================================================{CLR_RESET}")

def log_section(text):
    print(f"\n{CLR_BOLD}{CLR_BLUE}--- {text} ---{CLR_RESET}")

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("DATABASE_URL="):
                        db_url = line.strip().split("=", 1)[1].strip("\"'")
                        break
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is missing.")
    base_url = db_url.split("?")[0]
    return psycopg2.connect(base_url)

def is_unlisted_stock(ticker, name=""):
    clean_ticker = (ticker or "").upper().split(".")[0].strip()
    clean_name = (name or "").upper().strip()
    if clean_ticker in UNLISTED_STOCKS or (ticker or "").upper() in UNLISTED_STOCKS:
        return True
    if clean_name in UNLISTED_STOCKS:
        return True
    for u in UNLISTED_STOCKS:
        if u and (clean_ticker == u or clean_name == u or clean_name.startswith(u) or clean_ticker.startswith(u)):
            return True
    return False

def is_sif_fund(code, category="", inst_type=""):
    s_code = str(code or "").upper().strip()
    s_cat = str(category or "").upper().strip()
    s_inst = str(inst_type or "").upper().strip()
    return s_code.startswith("SIF") or "SIF" in s_code or "SIF" in s_cat or "SPECIALIZED" in s_cat or s_inst == "SIF"

def parse_date_to_iso(date_str):
    if not date_str:
        return None
    clean = str(date_str).strip()[:10]
    parts = clean.replace("/", "-").replace(".", "-").split("-")
    if len(parts) == 3:
        try:
            if len(parts[0]) == 4:
                return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
            elif len(parts[2]) == 4:
                return f"{int(parts[2]):04d}-{int(parts[1]):02d}-{int(parts[0]):02d}"
        except ValueError:
            pass
    return None

def to_dmy_format(iso_date_str):
    if not iso_date_str:
        return None
    clean = str(iso_date_str).strip()[:10]
    parts = clean.split("-")
    if len(parts) == 3 and len(parts[0]) == 4:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return clean

def format_ist_date(ts):
    # Convert UNIX timestamp to IST date string DD-MM-YYYY
    utc_dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    ist_offset_sec = 19800  # +5:30
    ist_dt = datetime.fromtimestamp(ts + ist_offset_sec, tz=timezone.utc)
    return ist_dt.strftime("%d-%m-%Y")

def to_amfi_date(date_iso):
    if not date_iso:
        dt = datetime.now()
    else:
        dt = datetime.strptime(date_iso, "%Y-%m-%d")
    return f"{dt.day:02d}-{MONTH_ABBRS[dt.month - 1]}-{dt.year}"

def from_amfi_date_to_dmy(amfi_date_str):
    parts = str(amfi_date_str).strip().split("-")
    if len(parts) != 3:
        return None
    day = parts[0].zfill(2)
    mon = AMFI_MONTH_MAP.get(parts[1].lower())
    year = parts[2]
    if not mon:
        return None
    return f"{day}-{mon}-{year}"

def fetch_mf_api(code):
    url = f"https://api.mfapi.in/mf/{code}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    for attempt in range(3):
        try:
            r = requests.get(url, headers=headers, timeout=18)
            if r.status_code == 200:
                data = r.json()
                if data and "data" in data and len(data["data"]) > 0:
                    return data
            elif r.status_code == 404:
                return None
        except Exception:
            time.sleep(0.5)
    return None

def fetch_upvaly_factsheet(isin):
    if not isin:
        return None
    url = f"https://groww.in/v1/api/data/mf/web/v1/scheme/isin/{isin}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None

def fetch_amfi_sif_history(from_dmy=None, to_dmy=None):
    from_dt = to_amfi_date(parse_date_to_iso(from_dmy) if from_dmy else "2024-01-01")
    to_dt = to_amfi_date(parse_date_to_iso(to_dmy) if to_dmy else datetime.now().strftime("%Y-%m-%d"))

    url = f"https://portal.amfiindia.com/SIF_DownloadNAVHistoryReport.aspx?frmdt={from_dt}&todt={to_dt}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/plain, */*",
    }
    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200 and r.text:
            records = []
            current_fund_house = "Specialized Investment Fund"
            current_scheme_type = "Specialized Investment Fund"
            current_category = "Specialized Investment Fund"

            for raw_line in r.text.split("\n"):
                line = raw_line.strip()
                if not line:
                    continue
                if ";" not in line:
                    if "Schemes (" in line or "Schemes(" in line:
                        m = re.match(r"^([^(]+)\((.+)\)$", line)
                        if m:
                            current_scheme_type = m.group(1).strip()
                            sub = m.group(2).strip()
                            cat_parts = sub.split("-")
                            current_category = (cat_parts[-1] if cat_parts else sub).strip()
                    elif not line.startswith("Scheme Code"):
                        current_fund_house = re.sub(r"\s+SIF$", "", line, flags=re.I).strip() or line
                    continue

                parts = line.split(";")
                if len(parts) >= 8 and parts[0].strip().upper().startswith("SIF"):
                    s_code = parts[0].strip()
                    s_name = parts[1].strip()
                    isin = parts[4].strip() or parts[5].strip()
                    nav_val = parts[6].strip()
                    d_raw = parts[7].strip()
                    d_dmy = from_amfi_date_to_dmy(d_raw)
                    if d_dmy and nav_val:
                        try:
                            nav_float = float(nav_val)
                            records.append({
                                "code": s_code,
                                "name": s_name,
                                "isin": isin,
                                "nav": nav_float,
                                "date": d_dmy,
                                "fund_house": current_fund_house,
                                "scheme_type": current_scheme_type,
                                "scheme_category": current_category,
                            })
                        except ValueError:
                            pass
            return records
    except Exception as e:
        print(f"  {CLR_YELLOW}[WARN]{CLR_RESET} SIF AMFI fetch failed: {e}")
    return []

def fetch_yahoo_stock_full_history(ticker):
    now_sec = int(time.time())
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    candidate_tickers = [ticker]
    if ticker.endswith(".NS"):
        candidate_tickers.append(ticker.replace(".NS", ".BO"))
    elif ticker.endswith(".BO"):
        candidate_tickers.append(ticker.replace(".BO", ".NS"))

    for cur_ticker in candidate_tickers:
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{cur_ticker}?period1=0&period2={now_sec}&interval=1d"
        for attempt in range(2):
            try:
                r = requests.get(url, headers=headers, timeout=25)
                if r.status_code != 200:
                    continue
                res_json = r.json()
                res = res_json.get("chart", {}).get("result", [])
                if not res or len(res) == 0:
                    continue
                data = res[0]
                meta = data.get("meta", {})
                timestamps = data.get("timestamp", [])
                indicators = data.get("indicators", {})
                quote = indicators.get("quote", [{}])[0]
                closes = quote.get("close", [])
                highs = quote.get("high", [])

                if not timestamps or not closes:
                    continue

                data_map = {}
                for i in range(len(timestamps)):
                    ts = timestamps[i]
                    c = closes[i] if i < len(closes) else None
                    h = highs[i] if i < len(highs) else None
                    p = c if c is not None else h
                    if p is not None and ts:
                        try:
                            val = round(float(p), 2)
                            if val > 0:
                                d_str = format_ist_date(ts)
                                data_map[d_str] = val
                        except (ValueError, TypeError):
                            continue

                # Live price injection if available
                live_price = meta.get("regularMarketPrice")
                live_time = meta.get("regularMarketTime")
                if live_price and live_time:
                    try:
                        lp = round(float(live_price), 2)
                        if lp > 0:
                            data_map[format_ist_date(live_time)] = lp
                    except (ValueError, TypeError):
                        pass

                rows = [{"date": d_str, "nav": price} for d_str, price in data_map.items()]
                # Sort descending by date
                rows.sort(key=lambda x: datetime.strptime(x["date"], "%d-%m-%Y"), reverse=True)

                if not rows:
                    continue

                # Earliest date is last element when sorted descending
                earliest_dmy = rows[-1]["date"]
                earliest_iso = parse_date_to_iso(earliest_dmy)
                latest_dmy = rows[0]["date"]
                latest_iso = parse_date_to_iso(latest_dmy)
                current_price = rows[0]["nav"]

                return {
                    "ticker": ticker,
                    "inception_date": earliest_iso,
                    "latest_date": latest_iso,
                    "current_price": current_price,
                    "history": rows,
                }
            except Exception:
                time.sleep(0.8)
    return None

def discover_all_portfolio_instruments(conn, specific_code=None, source_filter="all"):
    instruments = []
    benchmark_map = {}

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # 1. Core Schemes
        if source_filter in ["all", "core"]:
            cur.execute("""
                SELECT DISTINCT s.id, s.name, s.category, s.scheme_code_api
                FROM portfolio.schemes s
                WHERE s.id IN (SELECT scheme_id FROM portfolio.holdings_snapshot)
                   OR s.id IN (SELECT scheme_id FROM portfolio.transactions)
                   OR s.id IN (SELECT scheme_id FROM portfolio.sip_mandates)
                ORDER BY s.id;
            """)
            for r in cur.fetchall():
                code = (r["scheme_code_api"] or "").strip()
                if not code or (specific_code and code != specific_code):
                    continue
                is_sif = is_sif_fund(code, r["category"])
                instruments.append({
                    "id": r["id"],
                    "code": code,
                    "name": r["name"],
                    "category": r["category"] or "",
                    "source": "core",
                    "asset_type": "SIF" if is_sif else "MF",
                    "is_sif": is_sif,
                    "is_unlisted": False,
                })

        # 2. Benchmark Rules
        if source_filter in ["all", "core", "benchmark"]:
            cur.execute("SELECT benchmark_code, benchmark_fund_name, benchmark_name FROM portfolio.benchmark_rules;")
            for r in cur.fetchall():
                b_code = (r["benchmark_code"] or "").strip()
                b_name = r["benchmark_fund_name"] or r["benchmark_name"] or DEFAULT_BENCHMARK_NAME
                if b_code and (not specific_code or b_code == specific_code):
                    if b_code not in benchmark_map:
                        benchmark_map[b_code] = {
                            "id": b_code,
                            "code": b_code,
                            "name": b_name,
                            "category": "Benchmark Index Fund",
                            "source": "benchmark",
                            "asset_type": "BENCHMARK",
                            "is_sif": False,
                            "is_unlisted": False,
                        }

        # 3. Zerodha Schemes
        if source_filter in ["all", "zerodha"]:
            cur.execute("""
                SELECT s.id, s.name, s.category, s.instrument_type, s.scheme_code_api,
                       COALESCE(SUM(h.quantity), 0) AS total_qty
                FROM portfolio.zerodha_schemes s
                LEFT JOIN portfolio.zerodha_holdings h ON h.scheme_id = s.id
                WHERE s.id IN (SELECT scheme_id FROM portfolio.zerodha_holdings)
                   OR s.id IN (SELECT scheme_id FROM portfolio.zerodha_transactions)
                GROUP BY s.id, s.name, s.category, s.instrument_type, s.scheme_code_api
                ORDER BY s.id;
            """)
            for r in cur.fetchall():
                code = (r["scheme_code_api"] or "").strip()
                name = r["name"]
                qty = float(r["total_qty"] or 0)
                inst = (r["instrument_type"] or "").upper()
                is_mf = code.isdigit() and len(code) >= 5
                is_sif = is_sif_fund(code, r["category"], inst)

                if is_mf:
                    if specific_code and code != specific_code:
                        continue
                    instruments.append({
                        "id": r["id"],
                        "code": code,
                        "name": name,
                        "category": r["category"] or "",
                        "source": "zerodha",
                        "asset_type": "SIF" if is_sif else "MF",
                        "is_sif": is_sif,
                        "is_unlisted": False,
                    })
                elif qty > 0 or not code:
                    unlisted = is_unlisted_stock(code or name, name)
                    ticker = (code or name) if unlisted else (code if ("." in code) else (f"{code}.NS" if code else f"{name}.NS"))
                    if specific_code and ticker != specific_code and code != specific_code and name != specific_code:
                        continue
                    instruments.append({
                        "id": r["id"],
                        "code": ticker,
                        "name": name,
                        "category": r["category"] or "Stock",
                        "source": "zerodha",
                        "asset_type": "STOCK",
                        "is_sif": False,
                        "is_unlisted": unlisted,
                        "quantity": qty,
                    })

        # 4. MSFL Schemes
        if source_filter in ["all", "msfl"]:
            cur.execute("""
                SELECT s.id, s.name, s.category, s.instrument_type, s.scheme_code_api,
                       COALESCE(SUM(h.quantity), 0) AS total_qty
                FROM portfolio.msfl_schemes s
                LEFT JOIN portfolio.msfl_holdings h ON h.scheme_id = s.id
                WHERE s.id IN (SELECT scheme_id FROM portfolio.msfl_holdings)
                GROUP BY s.id, s.name, s.category, s.instrument_type, s.scheme_code_api
                ORDER BY s.id;
            """)
            for r in cur.fetchall():
                code = (r["scheme_code_api"] or "").strip()
                name = r["name"]
                qty = float(r["total_qty"] or 0)
                unlisted = is_unlisted_stock(code or name, name)
                ticker = (code or name) if unlisted else (code if ("." in code) else (f"{code}.NS" if code else f"{name}.NS"))
                if specific_code and ticker != specific_code and code != specific_code and name != specific_code:
                    continue
                instruments.append({
                    "id": r["id"],
                    "code": ticker,
                    "name": name,
                    "category": r["category"] or "Stock",
                    "source": "msfl",
                    "asset_type": "STOCK",
                    "is_sif": False,
                    "is_unlisted": unlisted,
                    "quantity": qty,
                })

        # 5. Watchlist Schemes
        if source_filter in ["all", "watchlist"]:
            cur.execute("SELECT id, scheme_name, category, instrument_type, scheme_code FROM portfolio.watchlist_schemes ORDER BY id;")
            for r in cur.fetchall():
                code = (r["scheme_code"] or "").strip()
                name = r["scheme_name"]
                inst = (r["instrument_type"] or "").upper()
                if specific_code and code != specific_code:
                    continue
                is_mf = inst == "MF" or (code.isdigit() and len(code) >= 5)
                is_sif = is_sif_fund(code, r["category"], inst)
                unlisted = is_unlisted_stock(code, name)
                instruments.append({
                    "id": r["id"],
                    "code": code,
                    "name": name,
                    "category": r["category"] or "",
                    "source": "watchlist",
                    "asset_type": "SIF" if is_sif else ("MF" if is_mf else "STOCK"),
                    "is_sif": is_sif,
                    "is_unlisted": unlisted,
                })

        for b_item in benchmark_map.values():
            instruments.append(b_item)

    return instruments

def inspect_instrument_status(conn, inst):
    code = inst["code"]
    source = inst["source"]
    asset_type = inst["asset_type"]

    db_launch = None
    db_count = 0
    earliest_nav = None
    latest_nav = None

    with conn.cursor() as cur:
        if source == "core":
            cur.execute("SELECT launch_date FROM portfolio.scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            if m_row and m_row[0]:
                db_launch = parse_date_to_iso(m_row[0])
            cur.execute("""
                SELECT COUNT(*), 
                       TO_CHAR(MIN(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD'),
                       TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD')
                FROM portfolio.scheme_nav_history WHERE scheme_code = %s;
            """, (code,))
            s_row = cur.fetchone()
            if s_row:
                db_count, earliest_nav, latest_nav = s_row[0], s_row[1], s_row[2]

        elif source == "zerodha":
            cur.execute("SELECT launch_date FROM portfolio.zerodha_scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            if m_row and m_row[0]:
                db_launch = parse_date_to_iso(m_row[0])
            cur.execute("""
                SELECT COUNT(*), 
                       TO_CHAR(MIN(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD'),
                       TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD')
                FROM portfolio.zerodha_scheme_nav_history WHERE scheme_code = %s;
            """, (code,))
            s_row = cur.fetchone()
            if s_row:
                db_count, earliest_nav, latest_nav = s_row[0], s_row[1], s_row[2]

        elif source == "msfl":
            cur.execute("SELECT launch_date FROM portfolio.msfl_scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            if m_row and m_row[0]:
                db_launch = parse_date_to_iso(m_row[0])
            cur.execute("""
                SELECT COUNT(*), 
                       TO_CHAR(MIN(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD'),
                       TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD')
                FROM portfolio.msfl_scheme_nav_history WHERE scheme_code = %s;
            """, (code,))
            s_row = cur.fetchone()
            if s_row:
                db_count, earliest_nav, latest_nav = s_row[0], s_row[1], s_row[2]

        elif source == "watchlist":
            cur.execute("SELECT first_nav_date FROM portfolio.watchlist_scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            if m_row and m_row[0]:
                db_launch = parse_date_to_iso(m_row[0])
            cur.execute("SELECT COUNT(*), MIN(date), MAX(date) FROM portfolio.watchlist_scheme_nav_history WHERE scheme_code = %s;", (code,))
            s_row = cur.fetchone()
            if s_row:
                db_count, earliest_nav, latest_nav = s_row[0], s_row[1], s_row[2]

        elif source == "benchmark":
            cur.execute("SELECT launch_date FROM portfolio.benchmark_nav_cache_meta WHERE benchmark_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            if m_row and m_row[0]:
                db_launch = parse_date_to_iso(m_row[0])
            cur.execute("""
                SELECT COUNT(*), 
                       TO_CHAR(MIN(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD'),
                       TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD')
                FROM portfolio.benchmark_nav_history WHERE benchmark_code = %s;
            """, (code,))
            s_row = cur.fetchone()
            if s_row:
                db_count, earliest_nav, latest_nav = s_row[0], s_row[1], s_row[2]

    needs_backfill = False
    reason = "OK"

    if not db_launch:
        needs_backfill = True
        reason = "Missing Launch/Inception Date in DB"
    elif db_count == 0:
        needs_backfill = True
        reason = "0 Historical NAV Records"
    elif earliest_nav and db_launch and earliest_nav > db_launch:
        # If earliest NAV in DB starts later than known launch date (by more than 7 days)
        try:
            d_earliest = datetime.strptime(earliest_nav, "%Y-%m-%d")
            d_launch = datetime.strptime(db_launch, "%Y-%m-%d")
            if (d_earliest - d_launch).days > 7:
                needs_backfill = True
                reason = f"Truncated History (DB starts {earliest_nav}, launch was {db_launch})"
        except ValueError:
            pass

    return {
        "db_launch": db_launch,
        "db_count": db_count,
        "earliest_nav": earliest_nav,
        "latest_nav": latest_nav,
        "needs_backfill": needs_backfill,
        "reason": reason,
    }

def resolve_unlisted_stock(conn, inst):
    code = inst["code"]
    name = inst["name"]
    source = inst["source"]

    start_date = None
    latest_date = datetime.now().strftime("%Y-%m-%d")
    seed_price = 10.0

    with conn.cursor() as cur:
        if source == "zerodha":
            cur.execute("""
                SELECT MIN(t.date), h.current_price, h.average_price
                FROM portfolio.zerodha_schemes s
                LEFT JOIN portfolio.zerodha_transactions t ON t.scheme_id = s.id
                LEFT JOIN portfolio.zerodha_holdings h ON h.scheme_id = s.id
                WHERE s.name = %s OR s.scheme_code_api = %s
                GROUP BY h.current_price, h.average_price;
            """, (name, code))
            row = cur.fetchone()
            if row:
                start_date = row[0]
                price = row[1] or row[2]
                if price:
                    seed_price = float(price)

        elif source == "msfl":
            cur.execute("""
                SELECT MIN(r.as_of_date), h.current_price, h.average_price
                FROM portfolio.msfl_schemes s
                LEFT JOIN portfolio.msfl_holdings h ON h.scheme_id = s.id
                LEFT JOIN portfolio.msfl_reports r ON r.id = h.report_id
                WHERE s.name = %s OR s.scheme_code_api = %s
                GROUP BY h.current_price, h.average_price;
            """, (name, code))
            row = cur.fetchone()
            if row:
                start_date = row[0]
                price = row[1] or row[2]
                if price:
                    seed_price = float(price)

    if not start_date:
        start_date = "2024-01-01"

    # Synthesize minimal start and latest points for unlisted stock
    rows = [
        {"date": to_dmy_format(latest_date), "nav": seed_price},
        {"date": to_dmy_format(start_date), "nav": seed_price},
    ]

    return {
        "ticker": code or name,
        "inception_date": start_date,
        "latest_date": latest_date,
        "current_price": seed_price,
        "history": rows,
    }

def backfill_instrument(conn, inst, sif_records_cache=None, dry_run=False):
    code = inst["code"]
    name = inst["name"]
    source = inst["source"]
    asset_type = inst["asset_type"]
    is_sif = inst["is_sif"]
    is_unlisted = inst["is_unlisted"]

    now_iso = datetime.now(timezone.utc).isoformat()
    inception_date = None
    history_points = []
    meta_info = {}

    # 1. Fetch Inception & History based on Asset Type
    if is_unlisted:
        data = resolve_unlisted_stock(conn, inst)
        inception_date = data["inception_date"]
        history_points = data["history"]
        meta_info["scheme_name"] = name
        meta_info["fund_house"] = "Unlisted Equity"
        meta_info["scheme_type"] = "Unlisted Stock"
        meta_info["scheme_category"] = "Stock"

    elif is_sif:
        # Check SIF cache
        matching = []
        if sif_records_cache:
            clean_c = code.upper().strip()
            matching = [r for r in sif_records_cache if r["code"].upper() == clean_c or clean_c in r["name"].upper()]

        if not matching:
            sif_cache = fetch_amfi_sif_history("2024-01-01", datetime.now().strftime("%Y-%m-%d"))
            if sif_cache:
                clean_c = code.upper().strip()
                matching = [r for r in sif_cache if r["code"].upper() == clean_c or clean_c in r["name"].upper()]

        if matching:
            # Sort ascending
            matching.sort(key=lambda x: datetime.strptime(x["date"], "%d-%m-%Y"))
            inception_date = parse_date_to_iso(matching[0]["date"])
            history_points = [{"date": r["date"], "nav": r["nav"]} for r in matching]
            meta_info["scheme_name"] = matching[0]["name"]
            meta_info["fund_house"] = matching[0]["fund_house"]
            meta_info["scheme_type"] = matching[0]["scheme_type"]
            meta_info["scheme_category"] = matching[0]["scheme_category"]
            meta_info["isin_growth"] = matching[0].get("isin")
        else:
            # Fallback for SIF
            inception_date = "2026-02-04"
            print(f"  {CLR_YELLOW}[WARN]{CLR_RESET} SIF not found on AMFI portal, keeping existing NAV points.")

    elif asset_type in ["MF", "BENCHMARK"]:
        api_data = fetch_mf_api(code)
        if api_data and "data" in api_data and api_data["data"]:
            raw_history = api_data["data"]
            # Earliest record is at the end of MFAPI data array
            earliest_dmy = raw_history[-1]["date"]
            inception_date = parse_date_to_iso(earliest_dmy)
            history_points = [{"date": r["date"], "nav": float(r["nav"])} for r in raw_history]

            meta = api_data.get("meta", {})
            meta_info["scheme_name"] = meta.get("scheme_name") or name
            meta_info["fund_house"] = meta.get("fund_house")
            meta_info["scheme_type"] = meta.get("scheme_type")
            meta_info["scheme_category"] = meta.get("scheme_category")
            meta_info["isin_growth"] = meta.get("isin_growth")
            meta_info["isin_div_reinvestment"] = meta.get("isin_div_reinvestment")

            # Check Upvaly factsheet for official inception date
            isin = meta.get("isin_growth") or meta.get("isin_div_reinvestment")
            if isin:
                factsheet = fetch_upvaly_factsheet(isin)
                if factsheet:
                    f_inc = parse_date_to_iso(factsheet.get("inceptionDate"))
                    if f_inc:
                        inception_date = f_inc
                    aum_str = str(factsheet.get("aum") or "").replace(",", "")
                    if aum_str:
                        try:
                            meta_info["corpus_cr"] = float(aum_str)
                        except ValueError:
                            pass
                    exp_str = str(factsheet.get("expenseRatio") or "")
                    if exp_str:
                        try:
                            meta_info["expense_ratio"] = float(exp_str)
                        except ValueError:
                            pass
                    meta_info["exit_load"] = factsheet.get("exitLoadMessage")

    elif asset_type == "STOCK":
        stock_data = fetch_yahoo_stock_full_history(code)
        if stock_data:
            inception_date = stock_data["inception_date"]
            history_points = stock_data["history"]
            meta_info["scheme_name"] = name
            meta_info["fund_house"] = "Equity"
            meta_info["scheme_type"] = "Stock"
            meta_info["scheme_category"] = "Equity Stock"

    # Ensure inception_date is never later than existing DB earliest NAV
    if inst.get("audit_status", {}).get("earliest_nav"):
        db_earliest = inst["audit_status"]["earliest_nav"]
        if not inception_date or db_earliest < inception_date:
            inception_date = db_earliest

    if not inception_date and not history_points:
        return False, "Failed to resolve inception date or history from external sources"

    if dry_run:
        return True, f"[DRY-RUN] Inception={inception_date}, History={len(history_points)} points"

    # 2. Write to Database
    with conn.cursor() as cur:
        if source == "zerodha" and inst.get("id"):
            cur.execute("UPDATE portfolio.zerodha_schemes SET scheme_code_api = %s WHERE id = %s AND (scheme_code_api IS NULL OR scheme_code_api = '');", (code, inst["id"]))
        elif source == "msfl" and inst.get("id"):
            cur.execute("UPDATE portfolio.msfl_schemes SET scheme_code_api = %s WHERE id = %s AND (scheme_code_api IS NULL OR scheme_code_api = '');", (code, inst["id"]))
        # A. Core Schemes
        if source == "core":
            cur.execute("""
                INSERT INTO portfolio.scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, launch_date, 
                 isin_growth, isin_div_reinvestment, corpus_cr, expense_ratio, exit_load, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    launch_date = COALESCE(EXCLUDED.launch_date, portfolio.scheme_nav_cache_meta.launch_date),
                    fund_house = COALESCE(EXCLUDED.fund_house, portfolio.scheme_nav_cache_meta.fund_house),
                    scheme_type = COALESCE(EXCLUDED.scheme_type, portfolio.scheme_nav_cache_meta.scheme_type),
                    scheme_category = COALESCE(EXCLUDED.scheme_category, portfolio.scheme_nav_cache_meta.scheme_category),
                    scheme_name = COALESCE(EXCLUDED.scheme_name, portfolio.scheme_nav_cache_meta.scheme_name),
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                meta_info.get("fund_house") or "Mutual Fund",
                meta_info.get("scheme_type") or "Mutual Fund",
                meta_info.get("scheme_category") or inst["category"],
                meta_info.get("scheme_name") or name,
                inception_date,
                meta_info.get("isin_growth"),
                meta_info.get("isin_div_reinvestment"),
                meta_info.get("corpus_cr"),
                meta_info.get("expense_ratio"),
                meta_info.get("exit_load"),
                now_iso
            ))

            if history_points:
                q = """
                    INSERT INTO portfolio.scheme_nav_history (scheme_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (scheme_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(history_points), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in history_points[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, q, chunk)

        # B. Zerodha Schemes
        elif source == "zerodha":
            cur.execute("""
                INSERT INTO portfolio.zerodha_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, launch_date, 
                 isin_growth, isin_div_reinvestment, corpus_cr, expense_ratio, exit_load, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    launch_date = COALESCE(EXCLUDED.launch_date, portfolio.zerodha_scheme_nav_cache_meta.launch_date),
                    fund_house = COALESCE(EXCLUDED.fund_house, portfolio.zerodha_scheme_nav_cache_meta.fund_house),
                    scheme_type = COALESCE(EXCLUDED.scheme_type, portfolio.zerodha_scheme_nav_cache_meta.scheme_type),
                    scheme_category = COALESCE(EXCLUDED.scheme_category, portfolio.zerodha_scheme_nav_cache_meta.scheme_category),
                    scheme_name = COALESCE(EXCLUDED.scheme_name, portfolio.zerodha_scheme_nav_cache_meta.scheme_name),
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                meta_info.get("fund_house") or "Equity",
                meta_info.get("scheme_type") or "Stock",
                meta_info.get("scheme_category") or inst["category"],
                meta_info.get("scheme_name") or name,
                inception_date,
                meta_info.get("isin_growth"),
                meta_info.get("isin_div_reinvestment"),
                meta_info.get("corpus_cr"),
                meta_info.get("expense_ratio"),
                meta_info.get("exit_load"),
                now_iso
            ))

            if history_points:
                q = """
                    INSERT INTO portfolio.zerodha_scheme_nav_history (scheme_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (scheme_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(history_points), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in history_points[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, q, chunk)

        # C. MSFL Schemes
        elif source == "msfl":
            cur.execute("""
                INSERT INTO portfolio.msfl_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, launch_date, 
                 isin_growth, isin_div_reinvestment, corpus_cr, expense_ratio, exit_load, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    launch_date = COALESCE(EXCLUDED.launch_date, portfolio.msfl_scheme_nav_cache_meta.launch_date),
                    fund_house = COALESCE(EXCLUDED.fund_house, portfolio.msfl_scheme_nav_cache_meta.fund_house),
                    scheme_type = COALESCE(EXCLUDED.scheme_type, portfolio.msfl_scheme_nav_cache_meta.scheme_type),
                    scheme_category = COALESCE(EXCLUDED.scheme_category, portfolio.msfl_scheme_nav_cache_meta.scheme_category),
                    scheme_name = COALESCE(EXCLUDED.scheme_name, portfolio.msfl_scheme_nav_cache_meta.scheme_name),
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                meta_info.get("fund_house") or "Equity",
                meta_info.get("scheme_type") or "Stock",
                meta_info.get("scheme_category") or inst["category"],
                meta_info.get("scheme_name") or name,
                inception_date,
                meta_info.get("isin_growth"),
                meta_info.get("isin_div_reinvestment"),
                meta_info.get("corpus_cr"),
                meta_info.get("expense_ratio"),
                meta_info.get("exit_load"),
                now_iso
            ))

            if history_points:
                q = """
                    INSERT INTO portfolio.msfl_scheme_nav_history (scheme_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (scheme_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(history_points), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in history_points[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, q, chunk)

        # D. Watchlist Schemes (Strict ISO YYYY-MM-DD)
        elif source == "watchlist":
            cur.execute("UPDATE portfolio.watchlist_schemes SET launch_date = %s WHERE scheme_code = %s;", (inception_date, code))

            # Convert history to ISO
            iso_history = []
            for r in history_points:
                iso_d = parse_date_to_iso(r["date"])
                if iso_d:
                    iso_history.append({"date": iso_d, "nav": float(r["nav"])})
            iso_history.sort(key=lambda x: x["date"])

            if iso_history:
                latest_p = iso_history[-1]
                prev_p = iso_history[-2] if len(iso_history) > 1 else None
                curr_nav = latest_p["nav"]
                prev_nav = prev_p["nav"] if prev_p else None
                from datetime import timedelta
                try:
                    cutoff_52w = (datetime.strptime(latest_p["date"][:10], "%Y-%m-%d") - timedelta(days=364)).strftime("%Y-%m-%d")
                    recent_history = [x for x in iso_history if x["date"] >= cutoff_52w] or iso_history
                except Exception:
                    recent_history = iso_history
                ath_nav = max(x["nav"] for x in recent_history)
                ath_date = next(x["date"] for x in recent_history if x["nav"] == ath_nav)
                dd_pct = round(((ath_nav - curr_nav) / ath_nav) * 100, 2) if ath_nav > 0 else 0

                cur.execute("""
                    INSERT INTO portfolio.watchlist_scheme_nav_cache_meta 
                    (scheme_code, scheme_name, fund_house, category, first_nav_date, last_nav_date,
                     last_nav, prev_nav, one_day_change_pct, ath_nav, ath_date, drawdown_pct, last_fetched_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (scheme_code) DO UPDATE SET
                        first_nav_date = COALESCE(EXCLUDED.first_nav_date, portfolio.watchlist_scheme_nav_cache_meta.first_nav_date),
                        last_nav_date = EXCLUDED.last_nav_date,
                        last_nav = EXCLUDED.last_nav,
                        prev_nav = EXCLUDED.prev_nav,
                        one_day_change_pct = EXCLUDED.one_day_change_pct,
                        ath_nav = EXCLUDED.ath_nav,
                        ath_date = EXCLUDED.ath_date,
                        drawdown_pct = EXCLUDED.drawdown_pct,
                        last_fetched_at = EXCLUDED.last_fetched_at;
                """, (
                    code,
                    meta_info.get("scheme_name") or name,
                    meta_info.get("fund_house"),
                    meta_info.get("scheme_category") or inst["category"],
                    inception_date,
                    latest_p["date"],
                    curr_nav,
                    prev_nav,
                    one_d,
                    ath_nav,
                    ath_date,
                    dd_pct,
                    now_iso
                ))

                q = """
                    INSERT INTO portfolio.watchlist_scheme_nav_history (scheme_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (scheme_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(iso_history), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], r["nav"], now_iso) for r in iso_history[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, q, chunk)

        # E. Benchmarks
        elif source == "benchmark":
            cur.execute("""
                INSERT INTO portfolio.benchmark_nav_cache_meta 
                (benchmark_code, benchmark_name, fund_house, scheme_type, scheme_category, launch_date, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (benchmark_code) DO UPDATE SET
                    launch_date = COALESCE(EXCLUDED.launch_date, portfolio.benchmark_nav_cache_meta.launch_date),
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                name,
                meta_info.get("fund_house") or "Benchmark Index",
                meta_info.get("scheme_type") or "Index Fund",
                "Benchmark Index Fund",
                inception_date,
                now_iso
            ))

            if history_points:
                q = """
                    INSERT INTO portfolio.benchmark_nav_history (benchmark_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (benchmark_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(history_points), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in history_points[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, q, chunk)

        conn.commit()

    return True, f"Inception: {inception_date} | Synced {len(history_points)} NAV records"

def main():
    parser = argparse.ArgumentParser(description="Sync Inception Dates & Historical NAV for Newly Added/Mapped Funds & Stocks")
    parser.add_argument("--dry-run", action="store_true", help="Inspect and simulate without modifying database")
    parser.add_argument("--live", action="store_true", help="Execute database writes and updates")
    parser.add_argument("--code", type=str, default=None, help="Sync specific scheme code or stock ticker only")
    parser.add_argument("--source", type=str, default="all", choices=["all", "core", "zerodha", "msfl", "watchlist", "benchmark"], help="Filter by source database table")
    parser.add_argument("--delay-ms", type=int, default=DEFAULT_DELAY_MS, help=f"Inter-request delay in ms (default: {DEFAULT_DELAY_MS})")
    args = parser.parse_args()

    # Dry-run is default unless --live is specified
    is_dry_run = not args.live or args.dry_run

    mode_label = f"{CLR_YELLOW}DRY-RUN (Simulation){CLR_RESET}" if is_dry_run else f"{CLR_GREEN}LIVE (Updating Database){CLR_RESET}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    log_header(f"Inception Date & Full NAV Sync Engine ({mode_label})")
    print(f"Timestamp: {now_str}")
    print(f"Filter: source={args.source}, code={args.code or 'ALL'}, delay={args.delay_ms}ms")

    conn = get_db_connection()

    # 1. Discover all active instruments in portfolio
    log_section("1. Discovering Active Portfolio Instruments")
    instruments = discover_all_portfolio_instruments(conn, specific_code=args.code, source_filter=args.source)
    print(f"Discovered {CLR_BOLD}{len(instruments)}{CLR_RESET} total instruments across [{args.source.upper()}].")

    # 2. Inspect inception & NAV coverage status
    log_section("2. Auditing Inception Dates & NAV History Coverage")
    candidates = []
    up_to_date_count = 0

    for inst in instruments:
        status = inspect_instrument_status(conn, inst)
        if status["needs_backfill"]:
            inst["audit_status"] = status
            candidates.append(inst)
        else:
            up_to_date_count += 1

    print(f"Found {CLR_GREEN}{up_to_date_count}{CLR_RESET} up-to-date instruments.")
    print(f"Found {CLR_YELLOW}{len(candidates)}{CLR_RESET} candidates missing inception date or historical NAVs.")

    if not candidates:
        print(f"\n{CLR_GREEN}✓ All instruments have valid inception dates and full historical NAV coverage!{CLR_RESET}")
        conn.close()
        return

    # Print candidates table
    print(f"\n{'SRC':<10} {'CODE':<16} {'NAME':<36} {'REASON':<40}")
    print("-" * 105)
    for c in candidates:
        print(f"{c['source'].upper():<10} {c['code']:<16} {c['name'][:34]:<36} {c['audit_status']['reason']:<40}")

    # 3. Synchronize Inception Dates & NAVs
    log_section(f"3. Synchronizing Inception & Full NAV Data ({len(candidates)} items)")

    # Pre-fetch SIF history if any candidate is SIF
    sif_cache = None
    has_sif = any(c["is_sif"] for c in candidates)
    if has_sif:
        print(f"{CLR_CYAN}[INFO]{CLR_RESET} Pre-fetching SIF history from AMFI portal...")
        sif_cache = fetch_amfi_sif_history("2024-01-01", datetime.now().strftime("%Y-%m-%d"))
        print(f"  -> Fetched {len(sif_cache)} historical SIF points.")

    results = []
    success_count = 0
    fail_count = 0

    for idx, c in enumerate(candidates, start=1):
        prefix = f"[{idx}/{len(candidates)}] [{c['source'].upper()}] {c['code']}"
        print(f"\n{CLR_BOLD}{prefix}{CLR_RESET} ({c['name']}):")

        ok, msg = backfill_instrument(conn, c, sif_records_cache=sif_cache, dry_run=is_dry_run)
        if ok:
            print(f"  {CLR_GREEN}✓ {msg}{CLR_RESET}")
            success_count += 1
            results.append((c, "SUCCESS", msg))
        else:
            print(f"  {CLR_RED}✗ {msg}{CLR_RESET}")
            fail_count += 1
            results.append((c, "FAILED", msg))

        if args.delay_ms > 0:
            time.sleep(args.delay_ms / 1000.0)

    # 4. Summary Report
    log_header("Execution Summary")
    print(f"Mode:            {mode_label}")
    print(f"Total Scanned:   {len(instruments)}")
    print(f"Up to Date:      {up_to_date_count}")
    print(f"Candidates:      {len(candidates)}")
    print(f"Successful Sync: {CLR_GREEN}{success_count}{CLR_RESET}")
    print(f"Failed / Gaps:   {CLR_RED}{fail_count}{CLR_RESET}")

    if is_dry_run:
        print(f"\n{CLR_YELLOW}NOTE: This was a DRY-RUN. Run with --live to write inception dates and NAVs to database.{CLR_RESET}")
    else:
        print(f"\n{CLR_GREEN}✓ Live sync complete. Inception dates recorded and NAV history backfilled.{CLR_RESET}")

    conn.close()

if __name__ == "__main__":
    main()
