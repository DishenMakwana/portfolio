#!/usr/bin/env python3
"""
Incremental NAV & Stock Sync Engine
Fetches latest NAV of all Mutual Funds from last NAV fetched date to today's date and saves to DB.
Fetches latest values for all active stocks (quantity > 0) and updates holdings & price history.
Includes millisecond rate-limiting between fund calls and structured terminal logging.
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

# ANSI Color Codes
CLR_RESET = "\033[0m"
CLR_BOLD = "\033[1m"
CLR_DIM = "\033[2m"
CLR_CYAN = "\033[36m"
CLR_GREEN = "\033[32m"
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

def normalize_sif_code(c):
    if not c:
        return ""
    c_up = str(c).upper().strip()
    if c_up.startswith("SIF-"):
        num_part = c_up[4:].lstrip("0") or "0"
        return f"SIF-{num_part}"
    return c_up

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
    return date_str

def log_header(text):
    print(f"\n{CLR_BOLD}{CLR_CYAN}======================================================================{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}  {text}{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}======================================================================{CLR_RESET}")

def log_section(text):
    print(f"\n{CLR_BOLD}{CLR_BLUE}--- {text} ---{CLR_RESET}")

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
        raise ValueError("DATABASE_URL environment variable is missing from .env or system environment.")
    
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

def parse_date_to_dmy(date_str):
    if not date_str:
        return None
    clean = str(date_str).strip()[:10]
    parts = clean.replace("/", "-").replace(".", "-").split("-")
    if len(parts) == 3:
        try:
            if len(parts[0]) == 4:  # YYYY-MM-DD -> DD-MM-YYYY
                return f"{int(parts[2]):02d}-{int(parts[1]):02d}-{int(parts[0]):04d}"
            elif len(parts[2]) == 4:  # DD-MM-YYYY
                return f"{int(parts[0]):02d}-{int(parts[1]):02d}-{int(parts[2]):04d}"
        except ValueError:
            pass
    return None

def format_ist_date(ts_sec):
    dt = datetime.fromtimestamp(ts_sec, tz=timezone.utc)
    return dt.strftime("%d-%m-%Y")

def is_sif_fund(code, category="", inst_type=""):
    s_code = str(code or "").upper().strip()
    s_cat = str(category or "").upper().strip()
    s_inst = str(inst_type or "").upper().strip()
    return s_code.startswith("SIF") or "SIF" in s_code or "SIF" in s_cat or "SPECIALIZED" in s_cat or s_inst == "SIF"

# Month abbreviations for AMFI
MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
AMFI_MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}

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
                # Format: Scheme Code;NAV Name;Plan;Option;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Net Asset Value;Date
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

def fetch_yahoo_stock(ticker):
    now_sec = int(time.time())
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=1mo&interval=1d"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    for attempt in range(3):
        try:
            r = requests.get(url, headers=headers, timeout=20)
            if r.status_code == 200:
                res_json = r.json()
                res = res_json.get("chart", {}).get("result", [])
                if not res:
                    return None
                result = res[0]
                meta = result.get("meta", {})
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

                # Live regularMarketPrice injection
                live_price = meta.get("regularMarketPrice")
                live_time = meta.get("regularMarketTime")
                if live_price and live_time:
                    try:
                        lp = round(float(live_price), 2)
                        data_map[format_ist_date(live_time)] = lp
                    except ValueError:
                        pass

                rows = [{"date": d_str, "nav": price} for d_str, price in data_map.items()]
                rows.sort(key=lambda x: datetime.strptime(x["date"], "%d-%m-%Y"), reverse=True)

                current_price = None
                if live_price:
                    try:
                        current_price = round(float(live_price), 2)
                    except ValueError:
                        pass
                if current_price is None and rows:
                    current_price = rows[0]["nav"]

                return {
                    "ticker": ticker,
                    "current_price": current_price,
                    "history": rows,
                    "latest_date": rows[0]["date"] if rows else None,
                }
        except Exception:
            time.sleep(0.5)
    return None

def discover_all_instruments(conn, specific_code=None):
    mf_dict = {}
    benchmark_dict = {}
    active_stocks = {}

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # 1. Core Schemes from user portfolio (holdings, transactions, SIP mandates)
        cur.execute("""
            SELECT DISTINCT s.id, s.name, s.category, s.scheme_code_api, m.isin_growth
            FROM portfolio.schemes s
            LEFT JOIN portfolio.scheme_nav_cache_meta m ON m.scheme_code = s.scheme_code_api
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
            if code not in mf_dict:
                mf_dict[code] = {
                    "code": code,
                    "name": r["name"],
                    "category": r["category"] or "",
                    "sources": set(),
                    "is_sif": is_sif,
                    "isin": r.get("isin_growth") or None,
                }
            else:
                if r.get("isin_growth") and not mf_dict[code].get("isin"):
                    mf_dict[code]["isin"] = r.get("isin_growth")
            mf_dict[code]["sources"].add("core")
            if is_sif:
                mf_dict[code]["is_sif"] = True

        # 2. Benchmark Rules
        cur.execute("SELECT benchmark_code, benchmark_fund_name, benchmark_name FROM portfolio.benchmark_rules;")
        for r in cur.fetchall():
            b_code = (r["benchmark_code"] or "").strip()
            b_name = r["benchmark_fund_name"] or r["benchmark_name"] or DEFAULT_BENCHMARK_NAME
            if b_code and (not specific_code or b_code == specific_code):
                if b_code not in benchmark_dict:
                    benchmark_dict[b_code] = {
                        "code": b_code,
                        "name": b_name,
                        "category": "Benchmark Index Fund",
                        "sources": {"benchmark"},
                        "is_sif": False,
                    }

        # Ensure default benchmark
        if not specific_code or DEFAULT_BENCHMARK_CODE == specific_code:
            if DEFAULT_BENCHMARK_CODE not in benchmark_dict:
                benchmark_dict[DEFAULT_BENCHMARK_CODE] = {
                    "code": DEFAULT_BENCHMARK_CODE,
                    "name": DEFAULT_BENCHMARK_NAME,
                    "category": "Benchmark Index Fund",
                    "sources": {"benchmark"},
                    "is_sif": False,
                }

        # 3. Zerodha Schemes & Active Holdings (from user holdings/transactions)
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

            if is_mf:
                if specific_code and code != specific_code:
                    continue
                if code not in mf_dict:
                    mf_dict[code] = {
                        "code": code,
                        "name": name,
                        "category": r["category"] or "",
                        "sources": set(),
                        "is_sif": is_sif_fund(code, r["category"], inst),
                    }
                mf_dict[code]["sources"].add("zerodha")
            elif qty > 0:
                ticker = code if ("." in code) else (f"{code}.NS" if code else f"{name}.NS")
                if specific_code and ticker != specific_code and code != specific_code and name != specific_code:
                    continue
                if ticker not in active_stocks:
                    active_stocks[ticker] = {
                        "ticker": ticker,
                        "name": name,
                        "scheme_id": r["id"],
                        "sources": set(),
                        "quantity": qty,
                    }
                active_stocks[ticker]["sources"].add("zerodha")

        # 4. MSFL Schemes & Active Holdings
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
            is_mf = code.isdigit() and len(code) >= 5

            if is_mf:
                if specific_code and code != specific_code:
                    continue
                if code not in mf_dict:
                    mf_dict[code] = {
                        "code": code,
                        "name": name,
                        "category": r["category"] or "",
                        "sources": set(),
                        "is_sif": is_sif_fund(code, r["category"]),
                    }
                mf_dict[code]["sources"].add("msfl")
            elif qty > 0:
                ticker = code if ("." in code) else (f"{code}.NS" if code else f"{name}.NS")
                if specific_code and ticker != specific_code and code != specific_code and name != specific_code:
                    continue
                if ticker not in active_stocks:
                    active_stocks[ticker] = {
                        "ticker": ticker,
                        "name": name,
                        "scheme_id": r["id"],
                        "sources": set(),
                        "quantity": qty,
                    }
                active_stocks[ticker]["sources"].add("msfl")

        # 5. Watchlist Schemes
        cur.execute("SELECT id, scheme_name, category, instrument_type, scheme_code FROM portfolio.watchlist_schemes ORDER BY id;")
        for r in cur.fetchall():
            code = (r["scheme_code"] or "").strip()
            inst = (r["instrument_type"] or "").upper()
            is_mf = inst == "MF" or (code.isdigit() and len(code) >= 5)

            if is_mf and code:
                if specific_code and code != specific_code:
                    continue
                if code not in mf_dict:
                    mf_dict[code] = {
                        "code": code,
                        "name": r["scheme_name"],
                        "category": r["category"] or "",
                        "sources": set(),
                        "is_sif": is_sif_fund(code, r["category"], inst),
                    }
                mf_dict[code]["sources"].add("watchlist")

    # Merge benchmarks into MF list if not already present
    for b_code, b_item in benchmark_dict.items():
        if b_code in mf_dict:
            mf_dict[b_code]["sources"].add("benchmark")
        else:
            mf_dict[b_code] = b_item

    return list(mf_dict.values()), list(active_stocks.values())

def get_fund_latest_db_date(conn, code):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD') AS max_date_iso,
                   TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'DD-MM-YYYY') AS max_date_dmy,
                   COUNT(*) AS total_points
            FROM portfolio.scheme_nav_history
            WHERE scheme_code = %s;
        """, (code,))
        row = cur.fetchone()
        if row and row[0]:
            return row[0], row[1], row[2]
        
        # Check benchmark table as fallback
        cur.execute("""
            SELECT TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD') AS max_date_iso,
                   TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'DD-MM-YYYY') AS max_date_dmy,
                   COUNT(*) AS total_points
            FROM portfolio.benchmark_nav_history
            WHERE benchmark_code = %s;
        """, (code,))
        b_row = cur.fetchone()
        if b_row and b_row[0]:
            return b_row[0], b_row[1], b_row[2]

    return None, None, 0

def get_stock_latest_db_date(conn, ticker):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD') AS max_date_iso,
                   TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'DD-MM-YYYY') AS max_date_dmy,
                   COUNT(*) AS total_points
            FROM portfolio.zerodha_scheme_nav_history
            WHERE scheme_code = %s;
        """, (ticker,))
        row = cur.fetchone()
        if row and row[0]:
            return row[0], row[1], row[2]

        cur.execute("""
            SELECT TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'YYYY-MM-DD') AS max_date_iso,
                   TO_CHAR(MAX(TO_DATE(date, 'DD-MM-YYYY')), 'DD-MM-YYYY') AS max_date_dmy,
                   COUNT(*) AS total_points
            FROM portfolio.msfl_scheme_nav_history
            WHERE scheme_code = %s;
        """, (ticker,))
        m_row = cur.fetchone()
        if m_row and m_row[0]:
            return m_row[0], m_row[1], m_row[2]

    return None, None, 0

def upsert_fund_navs(conn, code, item, new_records, meta=None, dry_run=False):
    if not new_records or dry_run:
        return len(new_records)

    # Deduplicate by date (keep last seen) to avoid CardinalityViolation in PostgreSQL execute_values ON CONFLICT
    dedup = {}
    for r in new_records:
        d = r.get("date")
        if d:
            dedup[d] = r
    new_records = list(dedup.values())
    if not new_records:
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    sources = item["sources"]
    meta = meta or {}

    with conn.cursor() as cur:
        # 1. Primary scheme_nav_history
        query = """
            INSERT INTO portfolio.scheme_nav_history (scheme_code, date, nav, fetched_at)
            VALUES %s
            ON CONFLICT (scheme_code, date) DO UPDATE SET
                nav = EXCLUDED.nav,
                fetched_at = EXCLUDED.fetched_at;
        """
        for i in range(0, len(new_records), BATCH_CHUNK_SIZE):
            chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in new_records[i:i + BATCH_CHUNK_SIZE]]
            execute_values(cur, query, chunk)

        fh = meta.get("fund_house") or item.get("fund_house") or ("Specialized Investment Fund" if item.get("is_sif") else "Mutual Fund")
        st = meta.get("scheme_type") or item.get("scheme_type") or ("Specialized Investment Fund" if item.get("is_sif") else "Mutual Fund")
        sc = meta.get("scheme_category") or item.get("category") or ("Specialized Investment Fund" if item.get("is_sif") else "Mutual Fund")
        sn = meta.get("scheme_name") or item.get("name") or code

        # Meta upsert
        cur.execute("""
            INSERT INTO portfolio.scheme_nav_cache_meta
            (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, last_fetched_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (scheme_code) DO UPDATE SET
                last_fetched_at = EXCLUDED.last_fetched_at;
        """, (code, fh, st, sc, sn, now_iso))

        # 2. Mirror to benchmark if applicable
        if "benchmark" in sources:
            b_query = """
                INSERT INTO portfolio.benchmark_nav_history (benchmark_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (benchmark_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(new_records), BATCH_CHUNK_SIZE):
                chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in new_records[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, b_query, chunk)

            cur.execute("""
                INSERT INTO portfolio.benchmark_nav_cache_meta (benchmark_code, benchmark_name, last_fetched_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (benchmark_code) DO UPDATE SET
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (code, sn, now_iso))

        # 3. Mirror to Zerodha if applicable
        if "zerodha" in sources:
            z_query = """
                INSERT INTO portfolio.zerodha_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(new_records), BATCH_CHUNK_SIZE):
                chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in new_records[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, z_query, chunk)

            cur.execute("""
                INSERT INTO portfolio.zerodha_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (code, fh, st, sc, sn, now_iso))

        # 4. Mirror to MSFL if applicable
        if "msfl" in sources:
            m_query = """
                INSERT INTO portfolio.msfl_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(new_records), BATCH_CHUNK_SIZE):
                chunk = [(code, r["date"], float(r["nav"]), now_iso) for r in new_records[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, m_query, chunk)

            cur.execute("""
                INSERT INTO portfolio.msfl_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (code, fh, st, sc, sn, now_iso))

        # 5. Mirror to Watchlist if applicable
        if "watchlist" in sources:
            w_query = """
                INSERT INTO portfolio.watchlist_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(new_records), BATCH_CHUNK_SIZE):
                chunk = [(code, parse_date_to_iso(r["date"]) or r["date"], float(r["nav"]), now_iso) for r in new_records[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, w_query, chunk)

            cur.execute("""
                INSERT INTO portfolio.watchlist_scheme_nav_cache_meta 
                (scheme_code, scheme_name, fund_house, category, last_fetched_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (
                code,
                meta.get("scheme_name") or item.get("name") or code,
                meta.get("fund_house"),
                meta.get("scheme_category") or item.get("category"),
                now_iso
            ))

    conn.commit()
    return len(new_records)

def update_stock_holdings_and_history(conn, stock, yahoo_data, dry_run=False):
    if not yahoo_data or dry_run:
        return 0

    ticker = stock["ticker"]
    current_price = yahoo_data["current_price"]
    history = yahoo_data["history"]

    # Deduplicate history by date (keep last seen) to avoid CardinalityViolation in ON CONFLICT
    dedup_hist = {}
    for r in history:
        d = r.get("date")
        if d:
            dedup_hist[d] = r
    history = list(dedup_hist.values())

    now_iso = datetime.now(timezone.utc).isoformat()
    sources = stock["sources"]

    points_inserted = 0

    with conn.cursor() as cur:
        # History insertion into Zerodha and/or MSFL
        if "zerodha" in sources:
            z_query = """
                INSERT INTO portfolio.zerodha_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history), BATCH_CHUNK_SIZE):
                chunk = [(ticker, r["date"], float(r["nav"]), now_iso) for r in history[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, z_query, chunk)
            points_inserted += len(history)

            cur.execute("""
                INSERT INTO portfolio.zerodha_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, last_fetched_at)
                VALUES (%s, 'Equity', 'Equity', 'Stock', %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (ticker, stock["name"], now_iso))

            if current_price is not None:
                # Update zerodha_holdings
                cur.execute("""
                    UPDATE portfolio.zerodha_holdings
                    SET current_price = %s,
                        current_value = ROUND((quantity * %s)::numeric, 2),
                        unrealized_pnl = ROUND(((quantity * %s) - invested_value)::numeric, 2),
                        unrealized_pnl_pct = CASE
                            WHEN invested_value > 0 THEN ROUND(((((quantity * %s) - invested_value) / invested_value) * 100)::numeric, 2)
                            ELSE 0
                        END,
                        updated_at = NOW()
                    WHERE scheme_id = %s;
                """, (current_price, current_price, current_price, current_price, stock["scheme_id"]))

        if "msfl" in sources:
            m_query = """
                INSERT INTO portfolio.msfl_scheme_nav_history (scheme_code, date, nav, fetched_at)
                VALUES %s
                ON CONFLICT (scheme_code, date) DO UPDATE SET
                    nav = EXCLUDED.nav,
                    fetched_at = EXCLUDED.fetched_at;
            """
            for i in range(0, len(history), BATCH_CHUNK_SIZE):
                chunk = [(ticker, r["date"], float(r["nav"]), now_iso) for r in history[i:i + BATCH_CHUNK_SIZE]]
                execute_values(cur, m_query, chunk)
            points_inserted += len(history)

            cur.execute("""
                INSERT INTO portfolio.msfl_scheme_nav_cache_meta 
                (scheme_code, fund_house, scheme_type, scheme_category, scheme_name, last_fetched_at)
                VALUES (%s, 'Equity', 'Equity', 'Stock', %s, %s)
                ON CONFLICT (scheme_code) DO UPDATE SET
                    last_fetched_at = EXCLUDED.last_fetched_at;
            """, (ticker, stock["name"], now_iso))

            if current_price is not None:
                # Update msfl_holdings
                cur.execute("""
                    UPDATE portfolio.msfl_holdings
                    SET current_price = %s,
                        current_value = ROUND((quantity * %s)::numeric, 2),
                        unrealized_pnl = ROUND(((quantity * %s) - invested_value)::numeric, 2),
                        unrealized_pnl_pct = CASE
                            WHEN invested_value > 0 THEN ROUND(((((quantity * %s) - invested_value) / invested_value) * 100)::numeric, 2)
                            ELSE 0
                        END,
                        updated_at = NOW()
                    WHERE scheme_id = %s;
                """, (current_price, current_price, current_price, current_price, stock["scheme_id"]))

    conn.commit()
    return points_inserted

def main():
    parser = argparse.ArgumentParser(description="Incremental NAV & Stock Sync Engine")
    parser.add_argument("--dry-run", action="store_true", help="Simulate run without writing to database")
    parser.add_argument("--delay-ms", type=int, default=DEFAULT_DELAY_MS, help=f"Inter-fund delay in ms (default: {DEFAULT_DELAY_MS})")
    parser.add_argument("--code", type=str, default=None, help="Sync specific scheme code or stock ticker only")
    parser.add_argument("--skip-stocks", action="store_true", help="Skip syncing active stocks")
    parser.add_argument("--skip-funds", action="store_true", help="Skip syncing mutual funds")
    args = parser.parse_args()

    mode_str = f"{CLR_YELLOW}DRY-RUN (No DB Writes){CLR_RESET}" if args.dry_run else f"{CLR_GREEN}LIVE (Sync to Database){CLR_RESET}"
    now_ist = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    log_header("PORTFOLIO INCREMENTAL NAV & STOCK SYNC ENGINE")
    print(f"  * Mode:       {mode_str}")
    print(f"  * Started At: {now_ist} IST")
    print(f"  * Fund Delay: {args.delay_ms} ms")
    if args.code:
        print(f"  * Filter:     Single Code [{args.code}]")

    start_time = time.time()
    conn = get_db_connection()

    # 1. Discover Instruments
    log_section("1. DISCOVERING INSTRUMENTS")
    funds, active_stocks = discover_all_instruments(conn, specific_code=args.code)
    print(f"  {CLR_CYAN}✓{CLR_RESET} Mutual Funds & Benchmarks: {CLR_BOLD}{len(funds)}{CLR_RESET} unique instruments")
    print(f"  {CLR_CYAN}✓{CLR_RESET} Active Portfolio Stocks:   {CLR_BOLD}{len(active_stocks)}{CLR_RESET} tickers (qty > 0)")

    total_mf_updated = 0
    total_mf_uptodate = 0
    total_mf_failed = 0
    total_mf_points = 0

    total_stock_updated = 0
    total_stock_skipped = 0
    total_stock_failed = 0
    total_stock_points = 0

    delay_sec = max(args.delay_ms, 10) / 1000.0

    # 2. Sync Mutual Funds
    if not args.skip_funds and len(funds) > 0:
        log_section(f"2. SYNCING MUTUAL FUND & BENCHMARK NAVs ({len(funds)} Instruments)")

        # Pre-fetch SIF feed if any SIF funds are present
        sif_records = []
        has_sif = any(f["is_sif"] for f in funds)
        if has_sif:
            print(f"  {CLR_DIM}Fetching latest AMFI SIF portal NAV snapshot...{CLR_RESET}")
            sif_records = fetch_amfi_sif_history()
            print(f"  {CLR_GREEN}✓{CLR_RESET} SIF Feed returned {len(sif_records)} scheme records")

        today_iso = datetime.now().strftime("%Y-%m-%d")

        for idx, item in enumerate(funds, 1):
            code = item["code"]
            name = item["name"]
            is_sif = item["is_sif"]
            sources_str = ",".join(sorted(item["sources"]))
            pct = (idx / len(funds)) * 100

            max_date_iso, max_date_dmy, count = get_fund_latest_db_date(conn, code)

            prefix = f"  [{idx:3d}/{len(funds):3d}] ({pct:5.1f}%) {CLR_BOLD}{code}{CLR_RESET} {name[:34]:<34} [{sources_str}]"

            if is_sif:
                # SIF Fund Sync
                norm_code = normalize_sif_code(code)
                target_isin = item.get("isin")
                matching = [
                    r for r in sif_records
                    if (target_isin and r.get("isin") == target_isin)
                    or normalize_sif_code(r["code"]) == norm_code
                    or (r.get("isin") and r["isin"] == code)
                ]
                if not matching:
                    target_name = re.sub(r"[^a-z0-9]", "", item["name"].lower())
                    matching = [
                        r for r in sif_records
                        if target_name and re.sub(r"[^a-z0-9]", "", r["name"].lower()) == target_name
                    ]
                    if not matching:
                        fund_house_hint = "isif" if "isif" in target_name else ("sapphire" if "sapphire" in target_name else "")
                        matching = [
                            r for r in sif_records
                            if target_name and (
                                (fund_house_hint and fund_house_hint in re.sub(r"[^a-z0-9]", "", r["name"].lower()))
                                and "hybrid" in target_name and "longshort" in target_name
                                and "hybrid" in re.sub(r"[^a-z0-9]", "", r["name"].lower())
                                and "longshort" in re.sub(r"[^a-z0-9]", "", r["name"].lower())
                                and ("direct" in target_name) == ("direct" in r["name"].lower())
                            )
                        ]
                if not matching:
                    print(f"{prefix} -> {CLR_YELLOW}[SIF NO DATA]{CLR_RESET} Not in current AMFI feed")
                    total_mf_failed += 1
                    continue

                matching.sort(key=lambda x: datetime.strptime(x["date"], "%d-%m-%Y"))
                dedup_m = {}
                for r in matching:
                    dedup_m[r["date"]] = r
                matching = list(dedup_m.values())

                new_points = []
                for r in matching:
                    d_iso = parse_date_to_iso(r["date"])
                    if not max_date_iso or (d_iso and d_iso > max_date_iso):
                        new_points.append(r)

                if new_points:
                    meta_sif = {
                        "fund_house": matching[-1].get("fund_house") or item.get("fund_house") or "Specialized Investment Fund",
                        "scheme_type": matching[-1].get("scheme_type") or "Specialized Investment Fund",
                        "scheme_category": matching[-1].get("scheme_category") or item.get("category") or "Specialized Investment Fund",
                        "scheme_name": matching[-1].get("name") or item.get("name") or code,
                    }
                    pts = upsert_fund_navs(conn, code, item, new_points, meta=meta_sif, dry_run=args.dry_run)
                    total_mf_updated += 1
                    total_mf_points += pts
                    newest = new_points[-1]
                    oldest = new_points[0]
                    dates_str = f"{oldest['date']} .. {newest['date']}" if len(new_points) > 1 else newest['date']
                    print(f"{prefix} -> {CLR_GREEN}[SYNCED]{CLR_RESET} +{len(new_points)} missing pts ({dates_str}) (Latest: {newest['date']} @ ₹{newest['nav']:.2f})")
                    if len(new_points) <= 5:
                        details = ", ".join([f"{p['date']} (₹{float(p['nav']):.2f})" for p in new_points])
                        print(f"      {CLR_CYAN}└─ Inserted missing dates:{CLR_RESET} {details}")
                    else:
                        sample = ", ".join([f"{p['date']} (₹{float(p['nav']):.2f})" for p in new_points[-3:]])
                        print(f"      {CLR_CYAN}└─ Inserted {len(new_points)} missing dates:{CLR_RESET} [{oldest['date']} .. {newest['date']}] (latest: {sample})")
                else:
                    print(f"{prefix} -> {CLR_DIM}[UP-TO-DATE]{CLR_RESET} DB at {max_date_dmy}")
                    total_mf_uptodate += 1

            else:
                # Regular MF or Benchmark
                api_data = fetch_mf_api(code)
                if not api_data or "data" not in api_data or not api_data["data"]:
                    print(f"{prefix} -> {CLR_RED}[API ERROR]{CLR_RESET} 0 points returned")
                    total_mf_failed += 1
                    time.sleep(delay_sec)
                    continue

                api_history = api_data["data"]
                meta = api_data.get("meta", {})

                new_points = []
                for r in api_history:
                    d_iso = parse_date_to_iso(r.get("date"))
                    if not max_date_iso or (d_iso and d_iso > max_date_iso):
                        new_points.append(r)

                if new_points:
                    pts = upsert_fund_navs(conn, code, item, new_points, meta=meta, dry_run=args.dry_run)
                    total_mf_updated += 1
                    total_mf_points += pts
                    newest = new_points[0]
                    oldest = new_points[-1]
                    dates_str = f"{oldest['date']} .. {newest['date']}" if len(new_points) > 1 else newest['date']
                    print(f"{prefix} -> {CLR_GREEN}[SYNCED]{CLR_RESET} +{len(new_points)} missing pts ({dates_str}) (Latest: {newest['date']} @ ₹{float(newest['nav']):.2f})")
                    if len(new_points) <= 5:
                        details = ", ".join([f"{p['date']} (₹{float(p['nav']):.2f})" for p in reversed(new_points)])
                        print(f"      {CLR_CYAN}└─ Inserted missing dates:{CLR_RESET} {details}")
                    else:
                        sample = ", ".join([f"{p['date']} (₹{float(p['nav']):.2f})" for p in new_points[:3]])
                        print(f"      {CLR_CYAN}└─ Inserted {len(new_points)} missing dates:{CLR_RESET} [{oldest['date']} .. {newest['date']}] (latest: {sample})")
                else:
                    print(f"{prefix} -> {CLR_DIM}[UP-TO-DATE]{CLR_RESET} DB at {max_date_dmy}")
                    total_mf_uptodate += 1

            # Inter-fund delay
            time.sleep(delay_sec)

    # 3. Sync Active Stocks
    if not args.skip_stocks and len(active_stocks) > 0:
        log_section(f"3. SYNCING ACTIVE STOCK VALUES & HOLDINGS ({len(active_stocks)} Tickers)")

        for idx, stock in enumerate(active_stocks, 1):
            ticker = stock["ticker"]
            name = stock["name"]
            sources_str = ",".join(sorted(stock["sources"]))
            pct = (idx / len(active_stocks)) * 100

            prefix = f"  [{idx:2d}/{len(active_stocks):2d}] ({pct:5.1f}%) {CLR_BOLD}{ticker:<14}{CLR_RESET} {name[:28]:<28} [{sources_str}]"

            # Check unlisted
            if is_unlisted_stock(ticker, name):
                print(f"{prefix} -> {CLR_YELLOW}[UNLISTED]{CLR_RESET} Skipping unlisted stock")
                total_stock_skipped += 1
                continue

            max_date_iso, max_date_dmy, count = get_stock_latest_db_date(conn, ticker)

            yahoo_data = fetch_yahoo_stock(ticker)
            if not yahoo_data or not yahoo_data.get("current_price"):
                print(f"{prefix} -> {CLR_RED}[YAHOO FAILED]{CLR_RESET} Unable to fetch price")
                total_stock_failed += 1
                time.sleep(delay_sec)
                continue

            curr_price = yahoo_data["current_price"]
            history = yahoo_data.get("history", [])

            # Filter points newer than DB max date
            new_history = []
            for r in history:
                d_iso = parse_date_to_iso(r["date"])
                if not max_date_iso or (d_iso and d_iso > max_date_iso):
                    new_history.append(r)

            yahoo_data["history"] = new_history
            pts = update_stock_holdings_and_history(conn, stock, yahoo_data, dry_run=args.dry_run)
            total_stock_updated += 1
            total_stock_points += pts

            if new_history:
                dates_str = f"{new_history[-1]['date']} .. {new_history[0]['date']}" if len(new_history) > 1 else new_history[0]['date']
                print(f"{prefix} -> {CLR_GREEN}[SYNCED]{CLR_RESET} Price: ₹{curr_price:,.2f} (+{len(new_history)} missing pts: {dates_str})")
                if len(new_history) <= 5:
                    details = ", ".join([f"{p['date']} (₹{float(p['nav']):.2f})" for p in reversed(new_history)])
                    print(f"      {CLR_CYAN}└─ Inserted missing dates:{CLR_RESET} {details}")
                else:
                    print(f"      {CLR_CYAN}└─ Inserted {len(new_history)} missing dates:{CLR_RESET} [{new_history[-1]['date']} .. {new_history[0]['date']}]")
            else:
                print(f"{prefix} -> {CLR_GREEN}[UPDATED]{CLR_RESET} Holding Price: ₹{curr_price:,.2f} (History up-to-date at {max_date_dmy})")
            time.sleep(delay_sec)

    elapsed = time.time() - start_time
    conn.close()

    # 4. Summary Report
    log_header("SYNC SUMMARY REPORT")
    print(f"  * Mutual Funds Synced:     {CLR_GREEN}{total_mf_updated} updated{CLR_RESET} | {total_mf_uptodate} up-to-date | {total_mf_failed} failed")
    print(f"  * Active Stocks Synced:    {CLR_GREEN}{total_stock_updated} updated{CLR_RESET} | {total_stock_skipped} unlisted | {total_stock_failed} failed")
    print(f"  * Total Data Points Added: {CLR_BOLD}{total_mf_points + total_stock_points}{CLR_RESET} records")
    print(f"  * Total Execution Time:    {CLR_BOLD}{elapsed:.2f} seconds{CLR_RESET}")
    print(f"  * Final Status:            {CLR_BOLD}{CLR_GREEN}COMPLETED SUCCESSFULLY{CLR_RESET}\n")

if __name__ == "__main__":
    main()
