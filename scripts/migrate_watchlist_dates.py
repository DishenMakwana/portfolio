#!/usr/bin/env python3
"""
Migrate portfolio.watchlist_scheme_nav_history dates to strict ISO format (YYYY-MM-DD),
deduplicate any collisions, and refresh portfolio.watchlist_scheme_nav_cache_meta.
"""

import os
import sys
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("[ERROR] DATABASE_URL not set in environment.")
    sys.exit(1)

# Remove ?schema=... if present for psycopg2
clean_db_url = DB_URL.split("?")[0]

def parse_to_iso(date_str: str) -> str:
    parts = date_str.strip().split("-")
    if len(parts) == 3:
        if len(parts[0]) == 4:
            # Already YYYY-MM-DD
            return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
        elif len(parts[2]) == 4:
            # DD-MM-YYYY -> YYYY-MM-DD
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    # Fallback to dateutil or strptime
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    raise ValueError(f"Cannot parse date: {date_str}")

def main():
    conn = psycopg2.connect(clean_db_url)
    now_iso = datetime.now(timezone.utc).isoformat()

    with conn.cursor() as cur:
        print("[INFO] Fetching all rows from portfolio.watchlist_scheme_nav_history...")
        cur.execute("SELECT id, scheme_code, date, nav, fetched_at FROM portfolio.watchlist_scheme_nav_history ORDER BY id ASC;")
        rows = cur.fetchall()
        print(f"[INFO] Total rows fetched: {len(rows)}")

        # Deduplicate and normalize
        # Key: (scheme_code, iso_date) -> dict
        clean_map = {}
        non_iso_count = 0

        for r_id, code, d_str, nav, fetched_at in rows:
            iso_d = parse_to_iso(d_str)
            if iso_d != d_str:
                non_iso_count += 1
            key = (code, iso_d)
            # If exists, keep row with newer fetched_at or higher id
            clean_map[key] = {
                "scheme_code": code,
                "date": iso_d,
                "nav": float(nav),
                "fetched_at": fetched_at or now_iso,
            }

        print(f"[INFO] Rows with non-ISO format converted: {non_iso_count}")
        print(f"[INFO] Clean deduplicated rows to insert: {len(clean_map)}")

        # Group by scheme_code for meta calculation
        scheme_history = {}
        for (code, iso_d), val in clean_map.items():
            if code not in scheme_history:
                scheme_history[code] = []
            scheme_history[code].append(val)

        # Replace table contents cleanly in a transaction
        print("[INFO] Truncating and reloading portfolio.watchlist_scheme_nav_history...")
        cur.execute("TRUNCATE TABLE portfolio.watchlist_scheme_nav_history;")

        insert_query = """
            INSERT INTO portfolio.watchlist_scheme_nav_history (scheme_code, date, nav, fetched_at)
            VALUES %s
        """
        all_values = [
            (v["scheme_code"], v["date"], v["nav"], v["fetched_at"])
            for v in clean_map.values()
        ]

        BATCH_SIZE = 2000
        for i in range(0, len(all_values), BATCH_SIZE):
            chunk = all_values[i : i + BATCH_SIZE]
            execute_values(cur, insert_query, chunk)

        print("[INFO] Recomputing portfolio.watchlist_scheme_nav_cache_meta for all schemes...")
        for code, hist in scheme_history.items():
            # Sort strictly chronologically by ISO date
            hist.sort(key=lambda x: x["date"])

            latest_pt = hist[-1]
            prev_pt = hist[-2] if len(hist) > 1 else None

            current_nav = latest_pt["nav"]
            prev_nav = prev_pt["nav"] if prev_pt else None

            # 1-day change
            one_day_pct = None
            if prev_nav is not None and prev_nav > 0:
                one_day_pct = round(((current_nav - prev_nav) / prev_nav) * 100, 2)

            # 52-Week ATH (364 Days)
            from datetime import timedelta
            try:
                cutoff_52w = (datetime.strptime(latest_pt["date"][:10], "%Y-%m-%d") - timedelta(days=364)).strftime("%Y-%m-%d")
                recent_hist = [h for h in hist if h["date"] >= cutoff_52w] or hist
            except Exception:
                recent_hist = hist

            ath_nav = 0.0
            ath_date = ""
            for h in recent_hist:
                if h["nav"] >= ath_nav:
                    ath_nav = h["nav"]
                    ath_date = h["date"]

            drawdown_pct = 0.0
            if ath_nav > 0:
                drawdown_pct = round(((ath_nav - current_nav) / ath_nav) * 100, 2)

            first_date = hist[0]["date"]
            last_date = latest_pt["date"]

            cur.execute("""
                UPDATE portfolio.watchlist_scheme_nav_cache_meta
                SET first_nav_date = %s,
                    last_nav_date = %s,
                    last_nav = %s,
                    prev_nav = %s,
                    one_day_change_pct = %s,
                    ath_nav = %s,
                    ath_date = %s,
                    drawdown_pct = %s,
                    last_fetched_at = %s,
                    updated_at = NOW()
                WHERE scheme_code = %s;
            """, (
                first_date,
                last_date,
                current_nav,
                prev_nav,
                one_day_pct,
                ath_nav,
                ath_date,
                drawdown_pct,
                now_iso,
                code
            ))

            print(f"  ✓ {code}: last={current_nav} ({last_date}), prev={prev_nav}, 1D={one_day_pct}%, ATH={ath_nav} ({ath_date}), DD={drawdown_pct}%")

        conn.commit()
        print("\n[SUCCESS] Watchlist dates successfully migrated to ISO format and cache meta updated!")

if __name__ == "__main__":
    main()
