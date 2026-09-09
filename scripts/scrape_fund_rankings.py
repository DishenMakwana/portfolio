#!/usr/bin/env python3
"""
Python Playwright scraper for Mutual Fund Returns & Category Rankings from Groww.
Supports automated Groww Entity Search API slug resolution and database caching.
Saves extracted Annualised and Absolute tables into PostgreSQL (portfolio.scheme_category_rankings).
"""

import sys
import os
import argparse
import asyncio
import json
import re
from datetime import datetime
from difflib import SequenceMatcher
import requests
import psycopg2
from playwright.async_api import async_playwright

# Verified Known Groww Slugs for 100% Guaranteed Exact Page Matches
KNOWN_GROWW_SLUGS = {
    # Flexi Cap Funds
    "118955": "hdfc-equity-fund-direct-growth",
    "103166": "birla-sun-life-equity-fund-direct-growth",
    "103215": "sbi-flexicap-fund-direct-growth",
    "100520": "franklin-india-prima-plus-direct-growth",
    "122639": "parag-parikh-long-term-value-fund-direct-growth",
    
    # Large & Mid Cap Funds
    "145112": "axis-large-mid-cap-fund-direct-growth",
    "103819": "dsp-large-mid-cap-fund-direct-plan-growth",
    "130496": "hdfc-large-and-mid-cap-fund-direct-growth",

    # Large Cap Funds
    "103174": "aditya-birla-sun-life-large-cap-direct-fund-growth",
    "106235": "nippon-india-large-cap-fund-direct-growth",

    # Mid Cap Funds
    "118989": "hdfc-mid-cap-opportunities-fund-direct-growth",
    "120403": "invesco-india-mid-cap-fund-direct-growth",
    "114564": "axis-midcap-fund-direct-growth",
    "100473": "franklin-india-prima-fund-direct-growth",
    "105503": "invesco-india-mid-cap-fund-direct-growth",
    "104908": "kotak-emerging-equity-scheme-direct-growth",
    "125305": "pgim-india-midcap-opportunities-fund-direct-growth",

    # Multi Cap Funds
    "152738": "franklin-india-multi-cap-fund-direct-growth",
    "149366": "hdfc-multi-cap-fund-direct-growth",
    "149182": "kotak-multicap-fund-direct-growth",

    # Focused Funds
    "105817": "franklin-india-high-growth-companies-fund-direct-growth",
    "102760": "hdfc-focused-30-fund-direct-growth",
    "102756": "sbi-focused-fund-direct-plan-growth",

    # ELSS Funds
    "119723": "sbi-elss-tax-saver-fund-direct-growth",

    # Value / Thematic Funds
    "151110": "hsbc-value-fund-direct-growth",
    "145896": "icici-prudential-india-opportunities-fund-direct-growth",

    # Hybrid & Multi Asset Funds
    "100356": "icici-prudential-aggressive-hybrid-fund-direct-growth",
    "152642": "bajaj-finserv-multi-asset-allocation-fund-direct-growth",
    "101144": "icici-prudential-multi-asset-allocation-fund-direct-growth",
    "148459": "nippon-india-multi-asset-allocation-fund-direct-growth",

    # Debt / Duration / Liquid Funds
    "112938": "nippon-india-credit-risk-fund-direct-growth",
    "120676": "icici-prudential-regular-i-come-fund-direct-growth",
    "100546": "franklin-india-liquid-fund-super-institutional-plan-direct-growth",
    "100837": "nippon-india-liquid-fund-direct-growth",
    "113135": "franklin-india-low-duration-fund-direct-growth",
    "111803": "aditya-birla-sun-life-medium-term-fund-direct-growth",
    "101232": "franklin-india-short-term-fund-direct-growth",
    "101317": "birla-sun-life-savings-fund-direct-growth",
    "144759": "axis-ultra-short-term-fund-direct-growth",
    "104138": "dsp-ultra-short-term-fund-direct-plan-growth",
    "152828": "franklin-india-ultra-short-term-fund-direct-growth",
    "145040": "hdfc-ultra-short-term-fund-direct-growth",
    "115092": "icici-prudential-regular-i-come-fund-direct-growth",
    "114359": "invesco-india-ultra-short-duration-fund-direct-growth",
    "102591": "kotak-treasury-advantage-fund-direct-growth",
    "138343": "pgim-india-ultra-short-term-direct-growth",
    "100641": "sbi-magnum-insta-cash-direct-growth",
}

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
        raise ValueError("DATABASE_URL not found in .env or environment")

    # Strip query parameters for psycopg2
    base_url = db_url.split("?")[0]
    return psycopg2.connect(base_url)

def clean_scheme_name_for_search(name: str) -> str:
    n = name
    n = re.sub(r'(?i)\bPru\b', 'Prudential', n)
    n = re.sub(r'(?i)\bSL\b', 'Sun Life', n)
    n = re.sub(r'(?i)\bST\b', 'Short Term', n)
    n = re.sub(r'(?i)\bReg\b', '', n)
    n = re.sub(r'(?i)\b\(G\)|\(D\)|\(Y\)|\-|\(|\)\b', ' ', n)
    n = re.sub(r'(?i)\b(Regular|Direct|Plan|Growth|IDCW|Dividend)\b', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def resolve_groww_slug_auto(scheme_code: str, scheme_name: str, db_slug: str = None) -> str:
    # 1. DB Cached Slug
    if db_slug:
        return db_slug

    # 2. Known Verified Slugs
    if scheme_code in KNOWN_GROWW_SLUGS:
        return KNOWN_GROWW_SLUGS[scheme_code]

    # 3. Groww Entity Search API
    clean_q = clean_scheme_name_for_search(scheme_name)
    try:
        url = f"https://groww.in/v1/api/search/v1/entity?app=false&entity_type=scheme&q={clean_q}"
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            content = resp.json().get("content", [])
            if content:
                # Find best fuzzy matching scheme title
                best_slug = None
                best_score = -1.0
                clean_target = clean_q.lower()
                for item in content:
                    title = item.get("title", "").lower()
                    slug = item.get("search_id", "")
                    score = SequenceMatcher(None, clean_target, title).ratio()
                    if "direct" in slug:
                        score += 0.15
                    if score > best_score:
                        best_score = score
                        best_slug = slug
                if best_slug:
                    return best_slug
    except Exception as e:
        print(f"[WARN] Groww search API failed for {scheme_name}: {e}")

    # 4. Fallback slug pattern
    slug_gen = scheme_name.lower()
    slug_gen = re.sub(r'\(g\)|\(d\)|\-|\(|\)|\.|\/|,', ' ', slug_gen)
    slug_gen = re.sub(r'\s+', '-', slug_gen.strip())
    if not slug_gen.endswith("-growth"):
        slug_gen += "-direct-growth"
    return slug_gen

async def scrape_groww_table_data(page, table_selector: str):
    try:
        tbl = await page.wait_for_selector(table_selector, timeout=7000)
    except Exception:
        tbl = None

    if not tbl:
        return None

    raw_text = await tbl.inner_text()
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    if len(lines) < 2:
        return None

    header_parts = re.split(r'\t+|\s{2,}', lines[0])
    horizons = [h.strip() for h in header_parts if h.strip() and h.strip().lower() != "name"]
    if not horizons:
        horizons = ["3Y", "5Y", "10Y", "All"]

    fund_returns = {}
    category_avg = {}
    category_rank = {}

    for line in lines[1:]:
        parts = re.split(r'\t+|\s{2,}', line)
        if not parts:
            continue
        row_title = parts[0].strip().lower()
        values = [v.strip() for v in parts[1:]]

        if "fund return" in row_title:
            for idx, h in enumerate(horizons):
                fund_returns[h] = values[idx] if idx < len(values) else "--"
        elif "category average" in row_title or "average" in row_title:
            for idx, h in enumerate(horizons):
                category_avg[h] = values[idx] if idx < len(values) else "--"
        elif "rank" in row_title:
            for idx, h in enumerate(horizons):
                category_rank[h] = values[idx] if idx < len(values) else "--"

    return {
        "horizons": horizons,
        "fundReturns": fund_returns,
        "categoryAvg": category_avg,
        "categoryRank": category_rank,
    }

async def scrape_scheme(browser, scheme_code: str, scheme_name: str, category_name: str, db_slug: str = None):
    slug = resolve_groww_slug_auto(scheme_code, scheme_name, db_slug)
    url = f"https://groww.in/mutual-funds/{slug}"
    
    page = await browser.new_page()
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        if not resp or resp.status != 200:
            fallback_slug = slug.replace("-direct-growth", "-growth")
            url = f"https://groww.in/mutual-funds/{fallback_slug}"
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            if not resp or resp.status != 200:
                print(f"[FAIL] HTTP {resp.status if resp else 'No response'} for {scheme_name} at {url}")
                return None
            slug = fallback_slug

        # 1. Extract Annualised Table
        annualised_data = await scrape_groww_table_data(page, 'table:has-text("Category average")')

        # 2. Extract Absolute Table (click visible tab button)
        absolute_data = None
        abs_elements = await page.query_selector_all('text="Absolute returns"')
        for el in abs_elements:
            try:
                if await el.is_visible():
                    await el.click(force=True)
                    await page.wait_for_timeout(800)
                    absolute_data = await scrape_groww_table_data(page, 'table:has-text("Category average")')
                    break
            except Exception:
                continue

        # 3. Extract Advanced Ratios, Market Cap Split, and Asset Allocation
        for i in range(1, 5):
            await page.evaluate(f"window.scrollTo(0, {i * 800})")
            await page.wait_for_timeout(200)
        await page.wait_for_timeout(400)
        body_text = await page.inner_text("body")

        def safe_float(val):
            if not val or val == "--" or val == "-" or val == "N/A":
                return None
            try:
                clean_val = val.replace("%", "").strip()
                return float(clean_val)
            except Exception:
                return None

        # Ratios
        top5 = re.search(r'Top 5\s*\n\s*([\d\.\%]+)', body_text)
        top20 = re.search(r'Top 20\s*\n\s*([\d\.\%]+)', body_text)
        pe = re.search(r'P/E Ratio\s*\n\s*([\d\.\-]+)', body_text)
        pb = re.search(r'P/B Ratio\s*\n\s*([\d\.\-]+)', body_text)
        alpha = re.search(r'Alpha\s*\n\s*([\d\.\-]+)', body_text)
        beta = re.search(r'Beta\s*\n\s*([\d\.\-]+)', body_text)
        sharpe = re.search(r'Sharpe\s*\n\s*([\d\.\-]+)', body_text)
        sortino = re.search(r'Sortino\s*\n\s*([\d\.\-]+)', body_text)
        advanced_ratios = {
            "top5": top5.group(1).strip() if (top5 and top5.group(1) != "--") else None,
            "top20": top20.group(1).strip() if (top20 and top20.group(1) != "--") else None,
            "peRatio": safe_float(pe.group(1)) if pe else None,
            "pbRatio": safe_float(pb.group(1)) if pb else None,
            "alpha": safe_float(alpha.group(1)) if alpha else None,
            "beta": safe_float(beta.group(1)) if beta else None,
            "sharpe": safe_float(sharpe.group(1)) if sharpe else None,
            "sortino": safe_float(sortino.group(1)) if sortino else None,
        }

        # 3. Market Cap Split
        large_cap = re.search(r'Large Cap\s*\n\s*([\d\.\-]+)%?', body_text)
        mid_cap = re.search(r'Mid Cap\s*\n\s*([\d\.\-]+)%?', body_text)
        small_cap = re.search(r'Small Cap\s*\n\s*([\d\.\-]+)%?', body_text)
        market_cap_split = {
            "largeCap": safe_float(large_cap.group(1)) if large_cap else 0.0,
            "midCap": safe_float(mid_cap.group(1)) if mid_cap else 0.0,
            "smallCap": safe_float(small_cap.group(1)) if small_cap else 0.0,
        }

        # 4. Asset Allocation / Split
        m_block = re.search(r'Equity / Debt / Cash split\s*\n(.*?)(?=\n(?:₹[\d,]+|Market Cap Split|Equity sector allocation|Debt sector allocation|Holdings|\Z))', body_text, re.DOTALL)
        raw_split = {}
        if m_block:
            pairs = re.findall(r'([A-Za-z\s]+)\n\s*([\-\d\.]+)%', m_block.group(1))
            for k, v in pairs:
                cleaned_k = k.strip()
                val = safe_float(v)
                if cleaned_k and val is not None:
                    raw_split[cleaned_k] = val
        
        if not raw_split:
            for label in ["Equity", "Debt", "Cash", "Real Estate", "Others"]:
                m_val = re.search(rf'{label}\s*\n\s*([\-\d\.]+)%', body_text)
                if m_val:
                    val = safe_float(m_val.group(1))
                    if val is not None:
                        raw_split[label] = val

        asset_allocation = {
            "equity": raw_split.get("Equity", 0.0),
            "debt": raw_split.get("Debt", 0.0),
            "cash": raw_split.get("Cash", 0.0),
            "realEstate": raw_split.get("Real Estate"),
            "commodities": raw_split.get("Commodities", raw_split.get("Commodity", raw_split.get("Gold"))),
            "hedgedEquity": raw_split.get("Hedged Equity"),
            "others": raw_split.get("Others"),
            "rawBreakdown": raw_split,
        }

        # 5. Expense Ratio
        exp_m = re.search(r'Expense\s*ratio[^\n\d]*\n\s*([\d\.]+)%', body_text, re.IGNORECASE)
        if not exp_m:
            exp_m = re.search(r'Expense\s*ratio\s*[:\n]\s*([\d\.]+)%', body_text, re.IGNORECASE)
        expense_ratio = safe_float(exp_m.group(1)) if exp_m else None

        # 6. Extract Exit Load, Stamp Duty, and Tax Implication
        exit_load_m = re.search(r'Exit load\s*\n\s*(.*?)(?=\n(?:Stamp duty|Tax implication|\Z))', body_text, re.DOTALL)
        stamp_duty_m = re.search(r'Stamp duty on investment:\s*([^\n]+)', body_text, re.IGNORECASE)
        if not stamp_duty_m:
            stamp_duty_m = re.search(r'Stamp duty[^\n]*\n\s*([^\n]+)', body_text, re.IGNORECASE)
        tax_implication_m = re.search(r'Tax implication\s*\n\s*(.*?)(?=\n(?:Check past data|Compare similar funds|Fund management|Similar funds|About|\Z))', body_text, re.DOTALL)

        exit_load_tax = {
            "exitLoad": exit_load_m.group(1).strip() if exit_load_m else None,
            "stampDuty": stamp_duty_m.group(1).strip() if stamp_duty_m else "0.005% (from July 1st, 2020)",
            "taxImplication": tax_implication_m.group(1).strip() if tax_implication_m else None,
        }

        if not annualised_data:
            print(f"[WARN] Returns and rankings table not found for {scheme_name} ({slug})")
            return None

        return {
            "schemeCode": scheme_code,
            "schemeName": scheme_name,
            "categoryName": category_name or "Equity Mutual Fund",
            "growwSlug": slug,
            "annualised": annualised_data,
            "absolute": absolute_data,
            "advancedRatios": advanced_ratios,
            "marketCap": market_cap_split,
            "assetAllocation": asset_allocation,
            "exitLoadTax": exit_load_tax,
            "expenseRatio": expense_ratio,
            "lastScrapedAt": datetime.now().isoformat(),
        }
    except Exception as e:
        print(f"[ERROR] Failed scraping {scheme_name} ({scheme_code}): {e}")
        return None
    finally:
        await page.close()

def save_ranking_to_db(data: dict):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO portfolio.scheme_category_rankings 
            (scheme_code, scheme_name, category_name, groww_slug, annualised_data, absolute_data, advanced_ratios_data, market_cap_data, asset_allocation_data, exit_load_tax_data, expense_ratio, last_scraped_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (scheme_code) DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                category_name = EXCLUDED.category_name,
                groww_slug = EXCLUDED.groww_slug,
                annualised_data = EXCLUDED.annualised_data,
                absolute_data = EXCLUDED.absolute_data,
                advanced_ratios_data = EXCLUDED.advanced_ratios_data,
                market_cap_data = EXCLUDED.market_cap_data,
                asset_allocation_data = EXCLUDED.asset_allocation_data,
                exit_load_tax_data = EXCLUDED.exit_load_tax_data,
                expense_ratio = EXCLUDED.expense_ratio,
                last_scraped_at = EXCLUDED.last_scraped_at,
                updated_at = NOW();
        """, (
            data["schemeCode"],
            data["schemeName"],
            data["categoryName"],
            data["growwSlug"],
            json.dumps(data["annualised"]),
            json.dumps(data["absolute"]) if data.get("absolute") else None,
            json.dumps(data["advancedRatios"]) if data.get("advancedRatios") else None,
            json.dumps(data["marketCap"]) if data.get("marketCap") else None,
            json.dumps(data["assetAllocation"]) if data.get("assetAllocation") else None,
            json.dumps(data["exitLoadTax"]) if data.get("exitLoadTax") else None,
            data.get("expenseRatio"),
            data["lastScrapedAt"],
        ))
        conn.commit()
        print(f"[SAVED] {data['schemeName']} ({data['schemeCode']}) -> Saved to DB.")
    except Exception as e:
        conn.rollback()
        print(f"[DB ERROR] Error saving {data['schemeCode']}: {e}")
    finally:
        cur.close()
        conn.close()

async def worker(queue, browser, semaphore):
    while True:
        try:
            s = await queue.get()
        except asyncio.CancelledError:
            break
        if s is None:
            queue.task_done()
            break
        async with semaphore:
            res = await scrape_scheme(browser, s["schemeCode"], s["schemeName"], s["category"], s.get("dbSlug"))
            if res:
                save_ranking_to_db(res)
        queue.task_done()

async def main():
    parser = argparse.ArgumentParser(description="Scrape Mutual Fund Category Returns and Rankings from Groww")
    parser.add_argument("--scheme-code", type=str, help="Specific scheme code to scrape")
    parser.add_argument("--scheme-codes", type=str, help="Comma-separated list of scheme codes to scrape")
    parser.add_argument("--active-only", action="store_true", help="Scrape only active mutual funds from the latest valuation report")
    parser.add_argument("--category", type=str, help="Filter by mutual fund category")
    parser.add_argument("--concurrency", type=int, default=5, help="Number of concurrent scraper pages (default: 5)")
    args = parser.parse_args()

    conn = get_db_connection()
    cur = conn.cursor()
    schemes_to_scrape = []

    try:
        if args.scheme_code:
            cur.execute("""
                SELECT scheme_code_api, name, category, NULL as groww_slug 
                FROM portfolio.schemes WHERE scheme_code_api = %s
                UNION
                SELECT scheme_code_api, name, category, NULL as groww_slug 
                FROM portfolio.zerodha_schemes WHERE scheme_code_api = %s
            """, (args.scheme_code, args.scheme_code))
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
        elif args.scheme_codes:
            code_list = [c.strip() for c in args.scheme_codes.split(",") if c.strip()]
            if code_list:
                cur.execute("""
                    SELECT DISTINCT s.scheme_code_api, s.name, s.category, r.groww_slug
                    FROM portfolio.schemes s
                    LEFT JOIN portfolio.scheme_category_rankings r ON s.scheme_code_api = r.scheme_code
                    WHERE s.scheme_code_api = ANY(%s)
                    UNION
                    SELECT DISTINCT zs.scheme_code_api, zs.name, zs.category, r.groww_slug
                    FROM portfolio.zerodha_schemes zs
                    LEFT JOIN portfolio.scheme_category_rankings r ON zs.scheme_code_api = r.scheme_code
                    WHERE zs.scheme_code_api = ANY(%s)
                    ORDER BY category, name;
                """, (code_list, code_list))
                rows = cur.fetchall()
                for r in rows:
                    schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
        elif args.active_only:
            # Query active mutual fund schemes in the latest report snapshot
            cur.execute("""
                SELECT DISTINCT s.scheme_code_api, s.name, s.category, r.groww_slug
                FROM portfolio.holdings_snapshot h
                JOIN portfolio.schemes s ON h.scheme_id = s.id
                LEFT JOIN portfolio.scheme_category_rankings r ON s.scheme_code_api = r.scheme_code
                WHERE h.report_id = (SELECT id FROM portfolio.reports ORDER BY as_of_date DESC LIMIT 1)
                  AND (h.balance_units > 0.0001 OR h.current_value > 0)
                  AND s.scheme_code_api ~ '^[0-9]{5,6}$'
                ORDER BY s.category, s.name;
            """)
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
        elif args.category:
            category_filter = f"%{args.category}%"
            cur.execute("""
                SELECT scheme_code_api, name, category, NULL as groww_slug FROM portfolio.schemes 
                WHERE (category ILIKE %s OR name ILIKE %s) AND scheme_code_api ~ '^[0-9]{5,6}$'
                UNION
                SELECT scheme_code_api, name, category, NULL as groww_slug FROM portfolio.zerodha_schemes 
                WHERE (category ILIKE %s OR name ILIKE %s) AND scheme_code_api ~ '^[0-9]{5,6}$'
            """, (category_filter, category_filter, category_filter, category_filter))
            rows = cur.fetchall()
            for r in rows:
                if r[0]:
                    schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
        else:
            # Fetch ALL numeric mutual fund schemes across all folios
            cur.execute("""
                SELECT DISTINCT s.scheme_code_api, s.name, s.category, r.groww_slug
                FROM portfolio.schemes s
                LEFT JOIN portfolio.scheme_category_rankings r ON s.scheme_code_api = r.scheme_code
                WHERE s.scheme_code_api ~ '^[0-9]{5,6}$'
                UNION
                SELECT DISTINCT zs.scheme_code_api, zs.name, zs.category, r.groww_slug
                FROM portfolio.zerodha_schemes zs
                LEFT JOIN portfolio.scheme_category_rankings r ON zs.scheme_code_api = r.scheme_code
                WHERE zs.scheme_code_api ~ '^[0-9]{5,6}$'
                ORDER BY category, name;
            """)
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
    finally:
        cur.close()
        conn.close()

    if not schemes_to_scrape:
        print("No matching mutual fund schemes found to scrape.")
        return

    print(f"Starting Playwright scraper for {len(schemes_to_scrape)} mutual fund schemes (Concurrency: {args.concurrency})...")
    queue = asyncio.Queue()
    for s in schemes_to_scrape:
        await queue.put(s)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        semaphore = asyncio.Semaphore(args.concurrency)
        tasks = [asyncio.create_task(worker(queue, browser, semaphore)) for _ in range(args.concurrency)]
        await queue.join()
        for t in tasks:
            t.cancel()
        await browser.close()

    print("All mutual fund category returns and rankings scraped and updated successfully.")

if __name__ == "__main__":
    asyncio.run(main())
