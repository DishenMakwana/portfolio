#!/usr/bin/env python3
"""
Comprehensive Audit Script in Python:
Audits date coverage from Start Date till Today for all Mutual Funds, Stocks, ETFs, and Benchmarks
across Core schemes, Zerodha, MSFL, and Watchlist database tables.
"""

import os
import sys
import time
from datetime import datetime, timezone
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

DEFAULT_BENCHMARK_CODE = "120716"
DEFAULT_BENCHMARK_NAME = "UTI Nifty 50 Index Fund Direct Growth"

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

def parse_date_to_iso(date_str):
    if not date_str:
        return None
    clean = str(date_str).strip()[:10]
    parts = clean.replace("/", "-").replace(".", "-").split("-")
    if len(parts) == 3:
        try:
            if len(parts[0]) == 4:  # YYYY-MM-DD
                return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
            elif len(parts[2]) == 4:  # DD-MM-YYYY
                return f"{int(parts[2]):04d}-{int(parts[1]):02d}-{int(parts[0]):02d}"
        except ValueError:
            pass
    return None

def fetch_mf_api(code):
    url = f"https://api.mfapi.in/mf/{code}"
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            data = r.json()
            if data and "data" in data and len(data["data"]) > 0:
                return data
    except Exception:
        pass
    return None

def fetch_yahoo_stock(ticker):
    now_sec = int(time.time())
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?period1=0&period2={now_sec}&interval=1d"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    try:
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code == 200:
            res_json = r.json()
            res = res_json.get("chart", {}).get("result", [])
            if res and len(res) > 0:
                timestamps = res[0].get("timestamp", [])
                if timestamps:
                    return timestamps
    except Exception:
        pass
    return None

def collect_all_instruments(conn):
    items = []
    benchmark_map = {}

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # 1. Core Schemes
        cur.execute("SELECT id, name, category, scheme_code_api FROM portfolio.schemes ORDER BY id;")
        core_rows = cur.fetchall()
        for r in core_rows:
            code = (r["scheme_code_api"] or "").strip()
            items.append({
                "id": r["id"],
                "name": r["name"],
                "code": code,
                "category": r["category"] or "",
                "asset_type": "MF",
                "source_table": "core",
            })

        # Get benchmark rules for mapping
        cur.execute("SELECT category_pattern, scheme_name_pattern, benchmark_code, benchmark_fund_name, benchmark_name, priority FROM portfolio.benchmark_rules ORDER BY priority DESC;")
        rules = cur.fetchall()

        for it in items:
            cat_clean = (it["category"] or "").lower().strip()
            name_clean = (it["name"] or "").lower().strip()
            b_code = DEFAULT_BENCHMARK_CODE
            b_name = DEFAULT_BENCHMARK_NAME
            for rule in rules:
                cp = (rule["category_pattern"] or "").lower().strip()
                sp = (rule["scheme_name_pattern"] or "").lower().strip()
                if sp and sp not in name_clean:
                    continue
                if cp and cp not in cat_clean:
                    continue
                b_code = (rule["benchmark_code"] or DEFAULT_BENCHMARK_CODE).strip()
                b_name = rule["benchmark_fund_name"] or rule["benchmark_name"] or DEFAULT_BENCHMARK_NAME
                break
            if b_code not in benchmark_map:
                benchmark_map[b_code] = b_name

        # 2. Zerodha Schemes
        cur.execute("SELECT id, name, category, instrument_type, scheme_code_api FROM portfolio.zerodha_schemes ORDER BY id;")
        z_rows = cur.fetchall()
        for r in z_rows:
            code = (r["scheme_code_api"] or "").strip()
            name_u = (r["name"] or "").upper()
            inst_u = (r["instrument_type"] or "").upper()
            is_mf = code.isdigit() and len(code) >= 5
            is_etf = "ETF" in inst_u or "ETF" in name_u or "BEES" in name_u
            asset_type = "MF" if is_mf else ("ETF" if is_etf else "STOCK")
            items.append({
                "id": r["id"],
                "name": r["name"],
                "code": code,
                "category": r["category"] or "",
                "asset_type": asset_type,
                "source_table": "zerodha",
            })

        # 3. MSFL Schemes
        cur.execute("SELECT id, name, category, instrument_type, scheme_code_api FROM portfolio.msfl_schemes ORDER BY id;")
        m_rows = cur.fetchall()
        for r in m_rows:
            code = (r["scheme_code_api"] or r["name"] or "").strip()
            items.append({
                "id": r["id"],
                "name": r["name"],
                "code": code,
                "category": r["category"] or "",
                "asset_type": "STOCK",
                "source_table": "msfl",
            })

        # 4. Watchlist Schemes
        cur.execute("SELECT id, scheme_name, category, instrument_type, scheme_code FROM portfolio.watchlist_schemes ORDER BY id;")
        w_rows = cur.fetchall()
        for r in w_rows:
            code = (r["scheme_code"] or "").strip()
            inst_u = (r["instrument_type"] or "").upper()
            name_u = (r["scheme_name"] or "").upper()
            asset_type = "STOCK" if inst_u == "STOCK" else ("ETF" if "ETF" in inst_u or "ETF" in name_u else "MF")
            items.append({
                "id": r["id"],
                "name": r["scheme_name"],
                "code": code,
                "category": r["category"] or "",
                "asset_type": asset_type,
                "source_table": "watchlist",
            })

        # 5. Benchmarks
        for b_code, b_name in benchmark_map.items():
            items.append({
                "id": b_code,
                "name": b_name,
                "code": b_code,
                "category": "Benchmark Index Fund",
                "asset_type": "BENCHMARK",
                "source_table": "core",
            })

    return items

def get_db_stats(conn, item):
    code = item["code"]
    source = item["source_table"]
    asset_type = item["asset_type"]

    if not code:
        return {"launch_date": None, "earliest_date": None, "latest_date": None, "count": 0}

    with conn.cursor() as cur:
        if asset_type == "BENCHMARK":
            cur.execute("SELECT launch_date FROM portfolio.benchmark_nav_cache_meta WHERE benchmark_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.benchmark_nav_history WHERE benchmark_code = %s;", (code,))
            rows = cur.fetchall()
        elif source == "zerodha":
            cur.execute("SELECT launch_date FROM portfolio.zerodha_scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.zerodha_scheme_nav_history WHERE scheme_code = %s;", (code,))
            rows = cur.fetchall()
        elif source == "msfl":
            cur.execute("SELECT launch_date FROM portfolio.msfl_scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.msfl_scheme_nav_history WHERE scheme_code = %s;", (code,))
            rows = cur.fetchall()
        elif source == "watchlist":
            cur.execute("SELECT first_nav_date FROM portfolio.watchlist_scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.watchlist_scheme_nav_history WHERE scheme_code = %s;", (code,))
            rows = cur.fetchall()
        else:
            cur.execute("SELECT launch_date FROM portfolio.scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.scheme_nav_history WHERE scheme_code = %s;", (code,))
            rows = cur.fetchall()

    launch_date = parse_date_to_iso(m_row[0]) if m_row and m_row[0] else None
    if not rows:
        return {"launch_date": launch_date, "earliest_date": None, "latest_date": None, "count": 0}

    parsed_dates = []
    for (d_str,) in rows:
        iso = parse_date_to_iso(d_str)
        if iso:
            parsed_dates.append(iso)

    if not parsed_dates:
        return {"launch_date": launch_date, "earliest_date": None, "latest_date": None, "count": len(rows)}

    parsed_dates.sort()
    return {
        "launch_date": launch_date,
        "earliest_date": parsed_dates[0],
        "latest_date": parsed_dates[-1],
        "count": len(rows),
    }

def inspect_instrument(conn, item, today_iso):
    code = item["code"]
    name = item["name"]
    asset_type = item["asset_type"]
    source = item["source_table"]

    if not code:
        return {
            "asset_type": asset_type,
            "source": source,
            "code": "N/A",
            "name": name,
            "start_date": None,
            "db_earliest": None,
            "db_latest": None,
            "db_count": 0,
            "api_count": 0,
            "status": "UNMAPPED",
            "notes": "Missing API code/symbol",
        }

    db_stats = get_db_stats(conn, item)

    api_earliest = None
    api_latest = None
    api_count = 0

    if asset_type in ["MF", "BENCHMARK"]:
        api_data = fetch_mf_api(code)
        if api_data and "data" in api_data:
            history = api_data["data"]
            api_count = len(history)
            if api_count > 0:
                api_latest = parse_date_to_iso(history[0].get("date"))
                api_earliest = parse_date_to_iso(history[-1].get("date"))
    else:
        timestamps = fetch_yahoo_stock(code)
        if timestamps:
            api_count = len(timestamps)
            first_dt = datetime.fromtimestamp(timestamps[0], tz=timezone.utc)
            last_dt = datetime.fromtimestamp(timestamps[-1], tz=timezone.utc)
            api_earliest = first_dt.strftime("%Y-%m-%d")
            api_latest = last_dt.strftime("%Y-%m-%d")

    start_date = api_earliest or db_stats["launch_date"]

    if db_stats["count"] == 0:
        return {
            "asset_type": asset_type,
            "source": source,
            "code": code,
            "name": name,
            "start_date": start_date,
            "db_earliest": None,
            "db_latest": None,
            "db_count": 0,
            "api_count": api_count,
            "status": "NO_DATA",
            "notes": f"0 records in DB (API has {api_count} points)",
        }

    start_complete = True
    start_gap_notes = ""
    if start_date and db_stats["earliest_date"]:
        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d")
            d_db_early = datetime.strptime(db_stats["earliest_date"], "%Y-%m-%d")
            diff_days = (d_db_early - d_start).days
            if diff_days > 7:
                start_complete = False
                start_gap_notes = f"DB starts {db_stats['earliest_date']} (+{diff_days}d after inception {start_date})"
        except Exception:
            pass

    end_complete = True
    end_gap_notes = ""
    target_end = api_latest or today_iso
    if target_end and db_stats["latest_date"]:
        try:
            d_target = datetime.strptime(target_end, "%Y-%m-%d")
            d_db_late = datetime.strptime(db_stats["latest_date"], "%Y-%m-%d")
            diff_days = (d_target - d_db_late).days
            if diff_days > 5:
                end_complete = False
                end_gap_notes = f"DB ends {db_stats['latest_date']} (-{diff_days}d behind {target_end})"
        except Exception:
            pass

    status = "OK"
    notes = "Complete from start date till today"
    if not start_complete and not end_complete:
        status = "START_GAP"
        notes = f"{start_gap_notes} & {end_gap_notes}"
    elif not start_complete:
        status = "START_GAP"
        notes = start_gap_notes
    elif not end_complete:
        status = "END_GAP"
        notes = end_gap_notes

    return {
        "asset_type": asset_type,
        "source": source,
        "code": code,
        "name": name,
        "start_date": start_date,
        "db_earliest": db_stats["earliest_date"],
        "db_latest": db_stats["latest_date"],
        "db_count": db_stats["count"],
        "api_count": api_count,
        "status": status,
        "notes": notes,
    }

def main():
    today_iso = datetime.now().strftime("%Y-%m-%d")

    print("\n=========================================================================")
    print("   COMPREHENSIVE AUDIT: ALL MF, STOCKS & ETFS (START DATE TILL TODAY)   ")
    print("=========================================================================")
    print(f" Audit Date: {today_iso}")
    print(" Collecting instruments across Core, Zerodha, MSFL, and Watchlist...\n")

    conn = get_db_connection()
    try:
        raw_items = collect_all_instruments(conn)
        # Deduplicate by (source, code)
        unique_items = []
        seen = set()
        for item in raw_items:
            key = f"{item['source_table']}:{item['code'] or item['name']}"
            if key not in seen:
                seen.add(key)
                unique_items.append(item)

        print(f" Found {len(unique_items)} total instruments:")
        print(f" - Mutual Funds:  {len([i for i in unique_items if i['asset_type'] == 'MF'])}")
        print(f" - Stocks:        {len([i for i in unique_items if i['asset_type'] == 'STOCK'])}")
        print(f" - ETFs:          {len([i for i in unique_items if i['asset_type'] == 'ETF'])}")
        print(f" - Benchmarks:    {len([i for i in unique_items if i['asset_type'] == 'BENCHMARK'])}\n")

        print(" Inspecting database date ranges and authoritative API histories...\n")

        results = []
        for idx, item in enumerate(unique_items):
            if idx > 0:
                time.sleep(0.08)

            r = inspect_instrument(conn, item, today_iso)
            results.append(r)

            if r["status"] == "OK":
                badge = "\033[32m[OK]\033[0m"
            elif r["status"] == "START_GAP":
                badge = "\033[33m[START_GAP]\033[0m"
            elif r["status"] == "END_GAP":
                badge = "\033[33m[END_GAP]\033[0m"
            elif r["status"] == "NO_DATA":
                badge = "\033[31m[NO_DATA]\033[0m"
            else:
                badge = "\033[35m[UNMAPPED]\033[0m"

            type_pad = f"[{r['asset_type']}]".ljust(11)
            code_pad = (r["code"] or "N/A").ljust(12)
            name_trunc = (r["name"][:29] + "...") if len(r["name"]) > 32 else r["name"].ljust(32)

            print(
                f"[{str(idx + 1).rjust(3)}/{len(unique_items)}] {badge} {type_pad} {code_pad} | {name_trunc} | Start: {r['start_date'] or 'None'} -> DB: [{r['db_earliest'] or 'None'} .. {r['db_latest'] or 'None'}] | Rows: {r['db_count']}"
            )
            if r["status"] != "OK" and r["notes"]:
                print(f"        \033[90m↳ {r['notes']}\033[0m")

        ok_count = len([r for r in results if r["status"] == "OK"])
        start_gap_count = len([r for r in results if r["status"] == "START_GAP"])
        end_gap_count = len([r for r in results if r["status"] == "END_GAP"])
        no_data_count = len([r for r in results if r["status"] == "NO_DATA"])
        unmapped_count = len([r for r in results if r["status"] == "UNMAPPED"])

        print("\n=========================================================================")
        print("                             AUDIT SUMMARY                               ")
        print("=========================================================================")
        print(f" Total Instruments Audited:      {len(results)}")
        print(f" \033[32m✔ Complete (Start Date -> Today): {ok_count}\033[0m")
        print(f" \033[33m▲ Start Date Gap:                {start_gap_count}\033[0m")
        print(f" \033[33m▲ End Date Gap:                  {end_gap_count}\033[0m")
        print(f" \033[31m✖ Zero Data in DB:               {no_data_count}\033[0m")
        print(f" \033[35m? Unmapped (No Code):            {unmapped_count}\033[0m")
        print("=========================================================================\n")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
