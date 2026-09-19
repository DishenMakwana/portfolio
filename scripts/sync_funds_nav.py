#!/usr/bin/env python3
"""
Python script to synchronize Mutual Funds, Benchmarks, Inception dates, and Historical NAVs.
Supports --dry-run (default), --live, --code=<code>, --source=<source>, --limit=<limit>.
"""

import os
import sys
import time
import argparse
from datetime import datetime, timezone
import requests
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

BATCH_CHUNK_SIZE = 500
INTER_REQUEST_DELAY_SEC = 0.06
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
            if len(parts[0]) == 4:
                return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
            elif len(parts[2]) == 4:
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

def fetch_upvaly_factsheet(isin):
    if not isin:
        return None
    url = f"https://finapi.upvaly.com/api/mf/isin/{isin}"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            res = r.json()
            if res.get("status") == "success" and res.get("data"):
                return res["data"]
    except Exception:
        pass
    return None

def discover_all_instruments(conn, source_filter="all", specific_code=None):
    items = []
    benchmark_map = {}

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if source_filter in ["all", "core"]:
            cur.execute("SELECT id, name, category, scheme_code_api FROM portfolio.schemes ORDER BY id;")
            for r in cur.fetchall():
                code = (r["scheme_code_api"] or "").strip()
                items.append({
                    "id": r["id"],
                    "code": code,
                    "name": r["name"],
                    "category": r["category"],
                    "source": "core",
                })

        if source_filter in ["all", "zerodha"]:
            cur.execute("SELECT id, name, category, scheme_code_api FROM portfolio.zerodha_schemes ORDER BY id;")
            for r in cur.fetchall():
                code = (r["scheme_code_api"] or "").strip()
                items.append({
                    "id": r["id"],
                    "code": code,
                    "name": r["name"],
                    "category": r["category"],
                    "source": "zerodha",
                })

        if source_filter in ["all", "msfl"]:
            cur.execute("SELECT id, name, category, scheme_code_api FROM portfolio.msfl_schemes ORDER BY id;")
            for r in cur.fetchall():
                code = (r["scheme_code_api"] or "").strip()
                items.append({
                    "id": r["id"],
                    "code": code,
                    "name": r["name"],
                    "category": r["category"],
                    "source": "msfl",
                })

        if source_filter in ["all", "watchlist"]:
            cur.execute("SELECT id, scheme_name, category, scheme_code FROM portfolio.watchlist_schemes ORDER BY id;")
            for r in cur.fetchall():
                code = (r["scheme_code"] or "").strip()
                items.append({
                    "id": r["id"],
                    "code": code,
                    "name": r["scheme_name"],
                    "category": r["category"],
                    "source": "watchlist",
                })

        # Fetch benchmark rules
        cur.execute("SELECT category_pattern, scheme_name_pattern, benchmark_code, benchmark_fund_name, benchmark_name FROM portfolio.benchmark_rules ORDER BY priority DESC;")
        rules = cur.fetchall()

    schemes_list = []
    for it in items:
        if specific_code and it["code"] != specific_code:
            continue

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

        it["benchmark_code"] = b_code
        it["benchmark_name"] = b_name
        schemes_list.append(it)

        if b_code and b_code not in benchmark_map:
            benchmark_map[b_code] = {
                "id": b_code,
                "code": b_code,
                "name": b_name,
                "category": "Benchmark Index Fund",
                "source": "core",
            }

    if DEFAULT_BENCHMARK_CODE not in benchmark_map:
        benchmark_map[DEFAULT_BENCHMARK_CODE] = {
            "id": DEFAULT_BENCHMARK_CODE,
            "code": DEFAULT_BENCHMARK_CODE,
            "name": DEFAULT_BENCHMARK_NAME,
            "category": "Benchmark Index Fund",
            "source": "core",
        }

    return schemes_list, list(benchmark_map.values())

def inspect_instrument_nav(conn, instrument, inst_type="scheme"):
    code = instrument["code"]
    name = instrument["name"]
    source = instrument["source"]

    if not code:
        return {
            "code": "N/A",
            "name": name,
            "type": inst_type,
            "source": source,
            "status": "MISSING_INSTRUMENT",
            "db_launch": None,
            "api_inception": None,
            "db_count": 0,
            "api_count": 0,
            "details": "No scheme_code_api mapped in database",
        }, None

    with conn.cursor() as cur:
        if inst_type == "benchmark":
            cur.execute("SELECT launch_date FROM portfolio.benchmark_nav_cache_meta WHERE benchmark_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.benchmark_nav_history WHERE benchmark_code = %s;", (code,))
            rows = cur.fetchall()
        else:
            cur.execute("SELECT launch_date FROM portfolio.scheme_nav_cache_meta WHERE scheme_code = %s LIMIT 1;", (code,))
            m_row = cur.fetchone()
            cur.execute("SELECT date FROM portfolio.scheme_nav_history WHERE scheme_code = %s;", (code,))
            rows = cur.fetchall()

    db_launch = parse_date_to_iso(m_row[0]) if m_row and m_row[0] else None
    db_count = len(rows)
    db_earliest = None
    if rows:
        dates = [parse_date_to_iso(r[0]) for r in rows if parse_date_to_iso(r[0])]
        if dates:
            dates.sort()
            db_earliest = dates[0]

    api_data = fetch_mf_api(code)
    if not api_data or "data" not in api_data or not api_data["data"]:
        return {
            "code": code,
            "name": name,
            "type": inst_type,
            "source": source,
            "status": "MISSING_HISTORICAL_DATA",
            "db_launch": db_launch,
            "api_inception": None,
            "db_count": db_count,
            "api_count": 0,
            "details": "API returned 0 historical records or failed",
        }, None

    api_history = api_data["data"]
    api_count = len(api_history)
    api_earliest = parse_date_to_iso(api_history[-1].get("date"))

    status = "MATCH"
    details = "Inception date and NAV history fully intact"

    if db_count == 0:
        status = "MISSING_HISTORICAL_DATA"
        details = f"Database has 0 NAV records (API has {api_count} points)"
    elif not db_launch or (api_earliest and db_launch != api_earliest):
        status = "DATE_MISMATCH"
        details = f"Launch date mismatch: DB='{db_launch or 'NULL'}' vs API Inception='{api_earliest or 'NULL'}'"
    elif api_earliest and db_earliest and db_earliest > api_earliest:
        status = "MISSING_HISTORICAL_DATA"
        details = f"Truncated history: DB starts {db_earliest}, fund launched {api_earliest}"

    return {
        "code": code,
        "name": name,
        "type": inst_type,
        "source": source,
        "status": status,
        "db_launch": db_launch,
        "api_inception": api_earliest,
        "db_count": db_count,
        "api_count": api_count,
        "details": details,
    }, api_data

def sync_instrument_to_db(conn, inspection, api_data):
    code = inspection["code"]
    inst_type = inspection["type"]
    source = inspection["source"]

    if not api_data or not api_data.get("data"):
        return False

    meta = api_data.get("meta", {})
    history = api_data.get("data", [])
    isin = meta.get("isin_growth") or meta.get("isin_div_reinvestment")

    launch_date = None
    corpus_cr = None
    expense_ratio = None
    exit_load = None

    if isin:
        factsheet = fetch_upvaly_factsheet(isin)
        if factsheet:
            launch_date = parse_date_to_iso(factsheet.get("inceptionDate"))
            aum_str = str(factsheet.get("aum") or "").replace(",", "")
            if aum_str:
                try:
                    corpus_cr = float(aum_str)
                except ValueError:
                    pass
            exp_str = str(factsheet.get("expenseRatio") or "")
            if exp_str:
                try:
                    expense_ratio = float(exp_str)
                except ValueError:
                    pass
            exit_load = factsheet.get("exitLoadMessage")

    if not launch_date and inspection["api_inception"]:
        launch_date = inspection["api_inception"]

    now_iso = datetime.now(timezone.utc).isoformat()

    with conn.cursor() as cur:
        if inst_type == "benchmark":
            cur.execute("""
                INSERT INTO portfolio.benchmark_nav_cache_meta
                (benchmark_code, benchmark_name, fund_house, scheme_type, scheme_category, isin_growth, isin_div_reinvestment, launch_date, corpus_cr, expense_ratio, exit_load, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (benchmark_code) DO UPDATE SET
                    benchmark_name = EXCLUDED.benchmark_name,
                    launch_date = EXCLUDED.launch_date,
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                meta.get("scheme_name") or inspection["name"],
                meta.get("fund_house"),
                meta.get("scheme_type"),
                meta.get("scheme_category"),
                meta.get("isin_growth"),
                meta.get("isin_div_reinvestment"),
                launch_date,
                corpus_cr,
                expense_ratio,
                exit_load,
                now_iso,
            ))

            if launch_date:
                cur.execute("UPDATE portfolio.benchmark_nav_cache_meta SET launch_date = %s WHERE benchmark_code = %s;", (launch_date, code))

            query = """
                INSERT INTO portfolio.benchmark_nav_history (benchmark_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (benchmark_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history), BATCH_CHUNK_SIZE):
                chunk = [(code, r["date"], float(r.get("nav") or 0), now_iso) for r in history[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, query, chunk)

        else:
            cur.execute("""
                INSERT INTO portfolio.scheme_nav_cache_meta
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, isin_growth, isin_div_reinvestment, launch_date, corpus_cr, expense_ratio, exit_load, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    scheme_name = EXCLUDED.scheme_name,
                    launch_date = EXCLUDED.launch_date,
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                meta.get("fund_house") or "Unknown",
                meta.get("scheme_type") or "Unknown",
                meta.get("scheme_category") or "Unknown",
                meta.get("scheme_name") or inspection["name"],
                meta.get("isin_growth"),
                meta.get("isin_div_reinvestment"),
                launch_date,
                corpus_cr,
                expense_ratio,
                exit_load,
                now_iso,
            ))

            if launch_date:
                cur.execute("UPDATE portfolio.scheme_nav_cache_meta SET launch_date = %s WHERE scheme_code = %s;", (launch_date, code))

            query = """
                INSERT INTO portfolio.scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history), BATCH_CHUNK_SIZE):
                chunk = [(code, r["date"], float(r.get("nav") or 0), now_iso) for r in history[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, query, chunk)

            # Mirror to source-specific tables if applicable
            if source == "zerodha":
                cur.execute("""
                    INSERT INTO portfolio.zerodha_scheme_nav_cache_meta
                    (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, isin_growth, isin_div_reinvestment, launch_date, last_fetched_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (scheme_code) DO UPDATE SET
                        launch_date = COALESCE(EXCLUDED.launch_date, portfolio.zerodha_scheme_nav_cache_meta.launch_date),
                        last_fetched_at = EXCLUDED.last_fetched_at;
                """, (code, meta.get("fund_house") or "Unknown", meta.get("scheme_type") or "Unknown", meta.get("scheme_category") or "Unknown", meta.get("scheme_name") or inspection["name"], meta.get("isin_growth"), meta.get("isin_div_reinvestment"), launch_date, now_iso))

                z_query = """
                    INSERT INTO portfolio.zerodha_scheme_nav_history (scheme_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (scheme_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(history), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], float(r.get("nav") or 0), now_iso) for r in history[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, z_query, chunk)

            elif source == "watchlist":
                cur.execute("""
                    INSERT INTO portfolio.watchlist_scheme_nav_cache_meta
                    (scheme_code, scheme_name, fund_house, category, first_nav_date, last_fetched_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (scheme_code) DO UPDATE SET
                        first_nav_date = COALESCE(EXCLUDED.first_nav_date, portfolio.watchlist_scheme_nav_cache_meta.first_nav_date),
                        last_fetched_at = EXCLUDED.last_fetched_at;
                """, (code, meta.get("scheme_name") or inspection["name"], meta.get("fund_house") or "Unknown", meta.get("scheme_category") or "Unknown", launch_date, now_iso))

                if launch_date:
                    cur.execute("UPDATE portfolio.watchlist_schemes SET launch_date = %s WHERE scheme_code = %s;", (launch_date, code))

                w_query = """
                    INSERT INTO portfolio.watchlist_scheme_nav_history (scheme_code, date, nav, fetched_at)
                    VALUES %s
                    ON CONFLICT (scheme_code, date) DO UPDATE SET nav = EXCLUDED.nav, fetched_at = EXCLUDED.fetched_at;
                """
                for i in range(0, len(history), BATCH_CHUNK_SIZE):
                    chunk = [(code, r["date"], float(r.get("nav") or 0), now_iso) for r in history[i:i + BATCH_CHUNK_SIZE]]
                    execute_values(cur, w_query, chunk)

        conn.commit()

    return True

def main():
    parser = argparse.ArgumentParser(description="Mutual Fund and Benchmark Inception & NAV Sync")
    parser.add_argument("--live", action="store_true", help="Execute database writes (default)")
    parser.add_argument("--dry-run", action="store_true", help="Run read-only inspection")
    parser.add_argument("--code", type=str, help="Specific scheme code to sync")
    parser.add_argument("--source", type=str, default="all", choices=["all", "core", "zerodha", "msfl", "watchlist"], help="Source table filter")
    parser.add_argument("--limit", type=int, help="Limit number of instruments to process")
    args = parser.parse_args()

    dry_run = args.dry_run

    print("\n=======================================================")
    print("   MUTUAL FUND & BENCHMARK INCEPTION & NAV SYNC ENGINE (PYTHON)  ")
    print("=======================================================")
    print(f" Mode:        {'\033[33mDRY-RUN (Read-Only)\033[0m' if dry_run else '\033[32mLIVE SYNC (Writing to DB)\033[0m'}")
    print(f" Source:      {args.source}")
    if args.code:
        print(f" Target Code: {args.code}")
    if args.limit:
        print(f" Limit:       {args.limit}")
    print("-------------------------------------------------------\n")

    conn = get_db_connection()
    start_time = time.time()

    try:
        schemes_list, benchmarks_list = discover_all_instruments(conn, args.source, args.code)
        targets = [{"item": s, "type": "scheme"} for s in schemes_list] + [{"item": b, "type": "benchmark"} for b in benchmarks_list]

        # Deduplicate
        unique_map = {}
        for t in targets:
            k = f"{t['type']}:{t['item']['code'] or t['item']['name']}"
            if k not in unique_map:
                unique_map[k] = t

        final_targets = list(unique_map.values())
        if args.limit and args.limit > 0:
            final_targets = final_targets[:args.limit]

        total = len(final_targets)
        print(f"[Sync Engine] Found {total} unique instruments to inspect.")

        stats = {
            "total": total,
            "matched": 0,
            "date_mismatch": 0,
            "missing_nav": 0,
            "unmapped": 0,
            "synced": 0,
            "failed": 0,
        }

        for idx, t in enumerate(final_targets):
            if idx > 0:
                time.sleep(INTER_REQUEST_DELAY_SEC)

            item = t["item"]
            inst_type = t["type"]
            inspection, api_data = inspect_instrument_nav(conn, item, inst_type)

            badge = (
                "\033[32m[MATCH]\033[0m" if inspection["status"] == "MATCH"
                else "\033[33m[DATE_MISMATCH]\033[0m" if inspection["status"] == "DATE_MISMATCH"
                else "\033[31m[MISSING_NAV]\033[0m" if inspection["status"] == "MISSING_HISTORICAL_DATA"
                else "\033[35m[NO_API_CODE]\033[0m"
            )

            if inspection["status"] == "MATCH":
                stats["matched"] += 1
            elif inspection["status"] == "DATE_MISMATCH":
                stats["date_mismatch"] += 1
            elif inspection["status"] == "MISSING_HISTORICAL_DATA":
                stats["missing_nav"] += 1
            else:
                stats["unmapped"] += 1

            code_pad = (inspection["code"] or "N/A").ljust(8)
            name_trunc = (inspection["name"][:37] + "...") if len(inspection["name"]) > 40 else inspection["name"].ljust(40)

            print(
                f"[{str(idx + 1).rjust(3)}/{total}] {badge} {code_pad} | {name_trunc} | DB: {inspection['db_launch'] or 'None'} | API: {inspection['api_inception'] or 'None'} | Rows: {inspection['db_count']}"
            )
            if inspection["status"] != "MATCH" and inspection["details"]:
                print(f"        \033[90m-> Reason: {inspection['details']}\033[0m")

            if not inspection["db_launch"] and inspection["api_inception"]:
                target_date = inspection["api_inception"]
                with conn.cursor() as cur:
                    if inst_type == "benchmark":
                        cur.execute("""
                            INSERT INTO portfolio.benchmark_nav_cache_meta (benchmark_code, benchmark_name, launch_date, last_fetched_at)
                            VALUES (%s, %s, %s, NOW())
                            ON CONFLICT (benchmark_code) DO UPDATE SET launch_date = EXCLUDED.launch_date;
                        """, (inspection["code"], inspection["name"], target_date))
                        cur.execute("UPDATE portfolio.benchmark_nav_cache_meta SET launch_date = %s WHERE benchmark_code = %s;", (target_date, inspection["code"]))
                    else:
                        cur.execute("""
                            INSERT INTO portfolio.scheme_nav_cache_meta (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, launch_date, last_fetched_at)
                            VALUES (%s, 'Unknown', 'Unknown', 'Unknown', %s, %s, NOW())
                            ON CONFLICT (scheme_code) DO UPDATE SET launch_date = EXCLUDED.launch_date;
                        """, (inspection["code"], inspection["name"], target_date))
                        cur.execute("UPDATE portfolio.scheme_nav_cache_meta SET launch_date = %s WHERE scheme_code = %s;", (target_date, inspection["code"]))
                    conn.commit()
                print(f"        \033[36m[ADDED_DATE_TO_DB] Saved inception date {target_date} into database\033[0m")
                inspection["db_launch"] = target_date

            if not dry_run and inspection["status"] != "MISSING_INSTRUMENT":
                success = sync_instrument_to_db(conn, inspection, api_data)
                if success:
                    stats["synced"] += 1
                else:
                    stats["failed"] += 1

        duration_sec = round(time.time() - start_time, 1)

        print("\n=======================================================")
        print("                 SYNCHRONIZATION REPORT                ")
        print("=======================================================")
        print(f" Total Instruments Checked:   {stats['total']}")
        print(f" \033[32m✔ Perfect Matches:           {stats['matched']}\033[0m")
        print(f" \033[33m▲ Inception Date Mismatches:  {stats['date_mismatch']}\033[0m")
        print(f" \033[31m✖ Missing Historical NAV:     {stats['missing_nav']}\033[0m")
        print(f" \033[35m? Unmapped Instruments:       {stats['unmapped']}\033[0m")
        if not dry_run:
            print(" -----------------------------------------------------")
            print(f" \033[32m★ Synced Successfully:        {stats['synced']}\033[0m")
            print(f" \033[31m⚠ Sync Errors:                {stats['failed']}\033[0m")
        print(f" Execution Time:              {duration_sec}s")
        print("=======================================================\n")

    finally:
        conn.close()

if __name__ == "__main__":
    main()
