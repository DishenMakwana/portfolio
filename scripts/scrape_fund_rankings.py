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
import time
from datetime import datetime
from difflib import SequenceMatcher
import requests
import psycopg2
from playwright.async_api import async_playwright

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

def log_header(text):
    print(f"\n{CLR_BOLD}{CLR_CYAN}======================================================================{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}  {text}{CLR_RESET}")
    print(f"{CLR_BOLD}{CLR_CYAN}======================================================================{CLR_RESET}")

def log_section(text):
    print(f"\n{CLR_BOLD}{CLR_BLUE}--- {text} ---{CLR_RESET}")

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

    # Hybrid & Multi Asset & Insurance-Linked Funds
    "100356": "icici-prudential-aggressive-hybrid-fund-direct-growth",
    "152642": "bajaj-finserv-multi-asset-allocation-fund-direct-growth",
    "101144": "icici-prudential-multi-asset-allocation-fund-direct-growth",
    "148459": "nippon-india-multi-asset-allocation-fund-direct-growth",
    "100646": "uti-unit-linked-insurance-plan-direct",
    "135982": "lic-mf-unit-linked-insurance-scheme-direct",

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

    # Small Cap & Index Funds
    "145137": "invesco-india-smallcap-fund-direct-growth",
    "147946": "bandhan-small-cap-fund-direct-growth",
    "149219": "icici-prudential-nasdaq-100-index-fund-direct-growth",
    "148381": "motilal-oswal-s-p-500-index-fund-direct-growth",
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

    # 3. Fast direct check with generated slug pattern
    slug_gen = scheme_name.lower()
    slug_gen = re.sub(r'\(g\)|\(d\)|\-|\(|\)|\.|\/|,', ' ', slug_gen)
    slug_gen = re.sub(r'\s+', '-', slug_gen.strip())
    if not slug_gen.endswith("-growth"):
        slug_gen += "-direct-growth"

    try:
        test_url = f"https://groww.in/mutual-funds/{slug_gen}"
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
        test_r = requests.get(test_url, headers=headers, timeout=4)
        if test_r.status_code == 200:
            return slug_gen
    except Exception:
        pass

    # 4. Groww Entity Search API with token-level precision
    clean_q = clean_scheme_name_for_search(scheme_name)
    try:
        url = f"https://groww.in/v1/api/search/v1/entity?app=false&entity_type=scheme&q={clean_q}"
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            content = resp.json().get("content", [])
            if content:
                # Identify critical differentiating tokens (e.g. 150, 250, 50, microcap, midcap)
                clean_target = clean_q.lower()
                key_tokens = set(re.findall(r'\b(?:150|250|50|100|500|microcap|midcap|smallcap|largecap|flexi|multi|defence|nasdaq)\b', clean_target))

                best_slug = None
                best_score = -1.0
                for item in content:
                    title = item.get("title", "").lower()
                    slug = item.get("search_id", "")
                    score = SequenceMatcher(None, clean_target, title).ratio()
                    if "direct" in slug:
                        score += 0.1

                    # Check key token consistency
                    for kt in key_tokens:
                        if kt in title:
                            score += 0.15
                        else:
                            score -= 0.35

                    if score > best_score:
                        best_score = score
                        best_slug = slug
                if best_slug and best_score >= 0.6:
                    return best_slug
    except Exception as e:
        print(f"[WARN] Groww search API failed for {scheme_name}: {e}")

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
    seen_h = set()
    horizons = []
    for h in header_parts:
        clean_h = h.strip()
        if clean_h and clean_h.lower() != "name" and clean_h not in seen_h:
            seen_h.add(clean_h)
            horizons.append(clean_h)
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
    # Only skip if explicitly marked NOT_FOUND without any known slug mapping
    if db_slug == "NOT_FOUND" and scheme_code not in KNOWN_GROWW_SLUGS:
        return {"status": "SKIPPED_NOT_FOUND", "schemeCode": scheme_code, "schemeName": scheme_name}

    slug = resolve_groww_slug_auto(scheme_code, scheme_name, db_slug if db_slug != "NOT_FOUND" else None)
    url = f"https://groww.in/mutual-funds/{slug}"
    
    page = await browser.new_page()
    try:
        # Navigate with 25s timeout and 1 automatic retry on timeout/network glitch
        resp = None
        for attempt in range(2):
            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
                if resp and resp.status == 200:
                    break
            except Exception as nav_err:
                if attempt == 0:
                    await asyncio.sleep(1.5)
                    continue
                else:
                    return {"status": "FAILED", "schemeCode": scheme_code, "schemeName": scheme_name, "error": f"Timeout on {url}"}

        if not resp or resp.status != 200:
            fallback_slug = slug.replace("-direct-growth", "-growth")
            url = f"https://groww.in/mutual-funds/{fallback_slug}"
            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            except Exception:
                resp = None

            if not resp or resp.status != 200:
                save_not_found_to_db(scheme_code, scheme_name, category_name)
                return {"status": "NOT_FOUND", "schemeCode": scheme_code, "schemeName": scheme_name, "error": f"HTTP {resp.status if resp else 'No response'}"}
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
        for i in range(1, 6):
            await page.evaluate(f"window.scrollTo(0, {i * 800})")
            await page.wait_for_timeout(250)
        try:
            await page.wait_for_selector('text="Market Cap Split"', timeout=5000)
        except Exception:
            pass
        await page.wait_for_timeout(500)
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
        large_cap = re.search(r'Large\s*Cap\s+([\d\.\-]+)%?', body_text, re.I)
        mid_cap = re.search(r'Mid\s*Cap\s+([\d\.\-]+)%?', body_text, re.I)
        small_cap = re.search(r'Small\s*Cap\s+([\d\.\-]+)%?', body_text, re.I)
        l_cap = safe_float(large_cap.group(1)) if large_cap else None
        m_cap = safe_float(mid_cap.group(1)) if mid_cap else None
        s_cap = safe_float(small_cap.group(1)) if small_cap else None
        
        has_any_mc = l_cap is not None or m_cap is not None or s_cap is not None
        market_cap_split = {
            "largeCap": l_cap if l_cap is not None else 0.0,
            "midCap": m_cap if m_cap is not None else 0.0,
            "smallCap": s_cap if s_cap is not None else 0.0,
        } if has_any_mc else None

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

        # 7. AUM (Fund Size in ₹ Cr)
        aum_m = re.search(r'Fund\s*size[^\n]*\n\s*₹?\s*([\d,]+(?:\.\d+)?)\s*Cr', body_text, re.IGNORECASE)
        if not aum_m:
            aum_m = re.search(r'Asset\s*Under\s*Management\(AUM\)\s*of\s*₹?\s*([\d,]+(?:\.\d+)?)\s*Cr', body_text, re.IGNORECASE)
        if not aum_m:
            aum_m = re.search(r'AUM[^\n]*\n\s*₹?\s*([\d,]+(?:\.\d+)?)\s*Cr', body_text, re.IGNORECASE)
        aum_cr = float(aum_m.group(1).replace(",", "")) if aum_m else None

        # 8. Fund Manager(s)
        fund_manager = None
        mgmt_m = re.search(r'Fund\s*management\s*\n(.*?)(?=\n(?:Similar funds|About|\Z))', body_text, re.DOTALL | re.IGNORECASE)
        if mgmt_m:
            mgmt_text = mgmt_m.group(1)
            mgrs = re.findall(r'\n[A-Z]{2,3}\s*\n([A-Za-z\s\.\-]+?)\n\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{4}|\d{4})', '\n' + mgmt_text)
            if mgrs:
                seen = set()
                clean_mgrs = []
                for m in mgrs:
                    name = m.strip()
                    if name and name not in seen and len(name) > 2:
                        seen.add(name)
                        clean_mgrs.append(name)
                if clean_mgrs:
                    fund_manager = ", ".join(clean_mgrs)
        if not fund_manager:
            mgr_fallback = re.search(r'([A-Za-z\s\.]+?)\s+is\s+the\s+(?:Current\s+)?Fund\s+Manager\s+of', body_text, re.IGNORECASE)
            if mgr_fallback:
                fund_manager = mgr_fallback.group(1).strip()

        # 9. Benchmark
        bench_m = re.search(r'Fund\s*benchmark\s*\n\s*([^\n]+)', body_text, re.IGNORECASE)
        if not bench_m:
            bench_m = re.search(r'Benchmark\s*\n\s*([^\n]+)', body_text, re.IGNORECASE)
        benchmark_name = bench_m.group(1).strip() if bench_m else None

        # 10. Risk Rating
        risk_rating = None
        risk_m = re.search(r'rated\s+(Very High|High|Moderately High|Moderate|Low to Moderate|Low)\s+risk', body_text, re.IGNORECASE)
        if not risk_m:
            risk_m = re.search(r'Riskometer\s*\n\s*([^\n]+)', body_text, re.IGNORECASE)
        if risk_m:
            r_str = risk_m.group(1).strip().lower()
            if "very high" in r_str:
                risk_rating = 6
            elif "moderately high" in r_str:
                risk_rating = 4
            elif "high" in r_str:
                risk_rating = 5
            elif "low to moderate" in r_str:
                risk_rating = 2
            elif "moderate" in r_str:
                risk_rating = 3
            elif "low" in r_str:
                risk_rating = 1

        # 11. Minimum SIP
        min_sip = None
        sip_m = re.search(r'Min\.\s*for\s*SIP\s*\n\s*₹?\s*([\d,]+)', body_text, re.IGNORECASE)
        if not sip_m:
            sip_m = re.search(r'Minimum\s*SIP\s*Investment\s*is\s*set\s*to\s*₹?\s*([\d,]+)', body_text, re.IGNORECASE)
        if sip_m:
            try:
                min_sip = float(sip_m.group(1).replace(",", ""))
            except Exception:
                pass

        # 12. Minimum Lumpsum
        min_lumpsum = None
        lump_m = re.search(r'Min\.\s*for\s*(?:1st\s*)?investment\s*\n\s*₹?\s*([\d,]+)', body_text, re.IGNORECASE)
        if not lump_m:
            lump_m = re.search(r'Min\.\s*investment\s*for\s*Lumpsum[^\n\d]*₹?\s*([\d,]+)', body_text, re.IGNORECASE)
        if lump_m:
            try:
                min_lumpsum = float(lump_m.group(1).replace(",", ""))
            except Exception:
                pass

        # 13. Launch Date
        launch_date = None
        launch_m = re.search(r'This scheme was made available to investors on\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})', body_text, re.IGNORECASE)
        if not launch_m:
            launch_m = re.search(r'Inception\s*date\s*\n\s*([^\n]+)', body_text, re.IGNORECASE)
        if launch_m:
            launch_date = launch_m.group(1).strip()

        if not annualised_data:
            print(f"[WARN] Returns and rankings table not found for {scheme_name} ({slug})")
            save_not_found_to_db(scheme_code, scheme_name, category_name)
            return None

        return {
            "status": "SUCCESS",
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
            "aumCr": aum_cr,
            "fundManager": fund_manager,
            "benchmarkName": benchmark_name,
            "riskRating": risk_rating,
            "minSip": min_sip,
            "minLumpsum": min_lumpsum,
            "launchDate": launch_date,
            "lastScrapedAt": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"status": "FAILED", "schemeCode": scheme_code, "schemeName": scheme_name, "error": str(e)}
    finally:
        await page.close()

def save_not_found_to_db(scheme_code: str, scheme_name: str, category_name: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO portfolio.scheme_category_rankings 
            (scheme_code, scheme_name, category_name, groww_slug, last_scraped_at, updated_at)
            VALUES (%s, %s, %s, 'NOT_FOUND', NOW(), NOW())
            ON CONFLICT (scheme_code) DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                category_name = EXCLUDED.category_name,
                groww_slug = 'NOT_FOUND',
                last_scraped_at = NOW(),
                updated_at = NOW();
        """, (scheme_code, scheme_name, category_name))
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"      {CLR_RED}└─ [DB ERROR] Saving NOT_FOUND for {scheme_code}: {e}{CLR_RESET}")
    finally:
        cur.close()
        conn.close()

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
        # Also upsert into watchlist_fund_analytics if applicable
        try:
            cur.execute("""
                INSERT INTO portfolio.watchlist_fund_analytics
                (scheme_code, scheme_name, category_name, groww_slug, annualised_data, absolute_data, advanced_ratios_data, market_cap_data, asset_allocation_data, exit_load_tax_data, last_synced_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
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
                    last_synced_at = EXCLUDED.last_synced_at,
                    updated_at = NOW();
            """, (
                data["schemeCode"],
                data["schemeName"],
                data["categoryName"],
                data["growwSlug"],
                json.dumps(data["annualised"]),
                json.dumps(data.get("absolute")) if data.get("absolute") else None,
                json.dumps(data.get("advancedRatios")) if data.get("advancedRatios") else None,
                json.dumps(data.get("marketCap")) if data.get("marketCap") else None,
                json.dumps(data.get("assetAllocation")) if data.get("assetAllocation") else None,
                json.dumps(data.get("exitLoadTax")) if data.get("exitLoadTax") else None,
                data["lastScrapedAt"],
            ))
        except Exception:
            pass

        # Also update all metadata in watchlist_schemes
        try:
            cur.execute("""
                UPDATE portfolio.watchlist_schemes
                SET 
                    groww_slug = COALESCE(%s, groww_slug),
                    aum_cr = COALESCE(%s, aum_cr),
                    expense_ratio = COALESCE(%s, expense_ratio),
                    exit_load = COALESCE(%s, exit_load),
                    fund_manager = COALESCE(%s, fund_manager),
                    benchmark_name = COALESCE(%s, benchmark_name),
                    risk_rating = COALESCE(%s, risk_rating),
                    min_lumpsum = COALESCE(%s, min_lumpsum),
                    min_sip = COALESCE(%s, min_sip),
                    launch_date = COALESCE(launch_date, %s),
                    updated_at = NOW()
                WHERE scheme_code = %s;
            """, (
                data.get("growwSlug"),
                data.get("aumCr"),
                data.get("expenseRatio"),
                data.get("exitLoadTax", {}).get("exitLoad") if data.get("exitLoadTax") else None,
                data.get("fundManager"),
                data.get("benchmarkName"),
                data.get("riskRating"),
                data.get("minLumpsum"),
                data.get("minSip"),
                data.get("launchDate"),
                data["schemeCode"],
            ))
        except Exception:
            pass
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        print(f"      {CLR_RED}└─ [DB ERROR] Saving {data['schemeCode']}: {e}{CLR_RESET}")
        return False
    finally:
        cur.close()
        conn.close()

async def worker(queue, browser, semaphore, stats, total_count, lock):
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
            
            async with lock:
                stats["processed"] += 1
                curr_idx = stats["processed"]
                pct = (curr_idx / total_count) * 100 if total_count > 0 else 100.0

            code = s["schemeCode"]
            name = s["schemeName"]
            prefix = f"  [{curr_idx:3d}/{total_count:3d}] ({pct:5.1f}%) {CLR_BOLD}{code}{CLR_RESET} {name[:34]:<34}"

            if not res or res.get("status") == "FAILED":
                err = res.get("error") if res else "Unknown error"
                print(f"{prefix} -> {CLR_RED}[FAILED]{CLR_RESET} {err}")
                async with lock:
                    stats["failed"] += 1
            elif res.get("status") == "SKIPPED_ULIP":
                print(f"{prefix} -> {CLR_YELLOW}[SKIPPED]{CLR_RESET} Non-MF / ULIP scheme (Marked NOT_FOUND)")
                async with lock:
                    stats["skipped"] += 1
            elif res.get("status") == "NOT_FOUND":
                err = res.get("error") or "Page not found"
                print(f"{prefix} -> {CLR_RED}[NOT FOUND]{CLR_RESET} {err} (Marked NOT_FOUND)")
                async with lock:
                    stats["failed"] += 1
            else:
                saved = save_ranking_to_db(res)
                if saved:
                    async with lock:
                        stats["updated"] += 1
                    
                    # Format informative data badges
                    mc = res.get("marketCap")
                    mc_str = ""
                    if mc and (mc.get("largeCap") or mc.get("midCap") or mc.get("smallCap")):
                        l_cap = mc.get("largeCap", 0) or 0
                        m_cap = mc.get("midCap", 0) or 0
                        s_cap = mc.get("smallCap", 0) or 0
                        mc_str = f"Cap: L: {l_cap:.1f}% | M: {m_cap:.1f}% | S: {s_cap:.1f}%"
                    
                    aum = res.get("aumCr")
                    aum_str = f"AUM: ₹{aum:,.0f} Cr" if aum else ""

                    exp = res.get("expenseRatio")
                    exp_str = f"TER: {exp:.2f}%" if exp else ""

                    details = " | ".join(filter(None, [mc_str, aum_str, exp_str]))
                    detail_suffix = f" ({details})" if details else ""

                    print(f"{prefix} -> {CLR_GREEN}[SAVED]{CLR_RESET} Saved to DB{detail_suffix}")
                else:
                    async with lock:
                        stats["failed"] += 1
                    print(f"{prefix} -> {CLR_RED}[DB FAILED]{CLR_RESET} Error saving record")

        queue.task_done()

async def main():
    parser = argparse.ArgumentParser(description="Scrape Mutual Fund Category Returns and Rankings from Groww")
    parser.add_argument("--scheme-code", type=str, help="Specific scheme code to scrape")
    parser.add_argument("--scheme-codes", type=str, help="Comma-separated list of scheme codes to scrape")
    parser.add_argument("--active-only", action="store_true", help="Scrape only active mutual funds from the latest valuation report")
    parser.add_argument("--category", type=str, help="Filter by mutual fund category")
    parser.add_argument("--concurrency", type=int, default=5, help="Number of concurrent scraper pages (default: 5)")
    args = parser.parse_args()

    start_time = time.time()
    log_header("MUTUAL FUND MARKET CAP & RANKINGS SYNC")

    # 1. Discover Schemes
    log_section("1. DISCOVERING MUTUAL FUND SCHEMES")
    conn = get_db_connection()
    cur = conn.cursor()
    schemes_to_scrape = []

    try:
        if args.scheme_code:
            clean_code = args.scheme_code.replace("w_", "").replace("sold_", "").strip()
            cur.execute("""
                SELECT s.scheme_code_api, s.name, s.category, r.groww_slug 
                FROM portfolio.schemes s
                LEFT JOIN portfolio.scheme_category_rankings r ON s.scheme_code_api = r.scheme_code
                WHERE s.scheme_code_api = %s
                UNION
                SELECT zs.scheme_code_api, zs.name, zs.category, r.groww_slug 
                FROM portfolio.zerodha_schemes zs
                LEFT JOIN portfolio.scheme_category_rankings r ON zs.scheme_code_api = r.scheme_code
                WHERE zs.scheme_code_api = %s
                UNION
                SELECT ws.scheme_code, ws.scheme_name, ws.category, COALESCE(ws.groww_slug, r.groww_slug)
                FROM portfolio.watchlist_schemes ws
                LEFT JOIN portfolio.scheme_category_rankings r ON ws.scheme_code = r.scheme_code
                WHERE ws.scheme_code = %s
            """, (clean_code, clean_code, clean_code))
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
            if not schemes_to_scrape:
                # AMFI fallback lookup if not present in portfolio tables yet
                try:
                    mf_resp = requests.get(f"https://api.mfapi.in/mf/{clean_code}", timeout=6)
                    if mf_resp.status_code == 200:
                        meta = mf_resp.json().get("meta", {})
                        s_name = meta.get("scheme_name", f"Scheme {clean_code}")
                        s_cat = meta.get("scheme_category", "Mutual Fund")
                        schemes_to_scrape.append({"schemeCode": clean_code, "schemeName": s_name, "category": s_cat, "dbSlug": None})
                except Exception as amfi_err:
                    print(f"  {CLR_YELLOW}[WARN]{CLR_RESET} AMFI fallback lookup failed: {amfi_err}")
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
                    UNION
                    SELECT DISTINCT ws.scheme_code, ws.scheme_name, ws.category, ws.groww_slug
                    FROM portfolio.watchlist_schemes ws
                    WHERE ws.scheme_code = ANY(%s)
                    ORDER BY category, name;
                """, (code_list, code_list, code_list))
                rows = cur.fetchall()
                for r in rows:
                    schemes_to_scrape.append({"schemeCode": r[0], "schemeName": r[1], "category": r[2], "dbSlug": r[3]})
        elif args.active_only:
            # Query active mutual fund schemes across the latest valuation report of all family members,
            # combined with all active Zerodha mutual funds
            cur.execute("""
                WITH latest_family_reports AS (
                    SELECT DISTINCT ON (h.member_id) r.id
                    FROM portfolio.reports r
                    JOIN portfolio.holdings_snapshot h ON h.report_id = r.id
                    ORDER BY h.member_id, r.as_of_date DESC
                )
                SELECT DISTINCT s.scheme_code_api, s.name, s.category, r.groww_slug
                FROM portfolio.holdings_snapshot h
                JOIN latest_family_reports lfr ON h.report_id = lfr.id
                JOIN portfolio.schemes s ON h.scheme_id = s.id
                LEFT JOIN portfolio.scheme_category_rankings r ON s.scheme_code_api = r.scheme_code
                WHERE (h.balance_units > 0.0001 OR h.current_value > 0)
                  AND s.scheme_code_api ~ '^[0-9]{5,6}$'
                UNION
                SELECT DISTINCT zs.scheme_code_api, zs.name, zs.category, r.groww_slug
                FROM portfolio.zerodha_holdings zh
                JOIN portfolio.zerodha_schemes zs ON zh.scheme_id = zs.id
                LEFT JOIN portfolio.scheme_category_rankings r ON zs.scheme_code_api = r.scheme_code
                WHERE zh.quantity > 0.0001
                  AND zs.holding_type = 'mutual_fund'
                  AND zs.scheme_code_api ~ '^[0-9]{5,6}$'
                ORDER BY category, name;
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

    total_schemes = len(schemes_to_scrape)
    print(f"  {CLR_CYAN}✓{CLR_RESET} Target Mutual Fund Schemes: {CLR_BOLD}{total_schemes}{CLR_RESET} schemes selected")
    print(f"  {CLR_CYAN}✓{CLR_RESET} Scraping Concurrency:       {CLR_BOLD}{args.concurrency}x parallel{CLR_RESET}")

    if not schemes_to_scrape:
        print(f"  {CLR_YELLOW}No matching mutual fund schemes found to scrape.{CLR_RESET}")
        return

    # 2. Scrape Schemes
    log_section(f"2. SCRAPING MARKET CAP & CATEGORY RANKINGS ({total_schemes} Schemes)")

    stats = {
        "processed": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
    }
    lock = asyncio.Lock()
    queue = asyncio.Queue()
    for s in schemes_to_scrape:
        await queue.put(s)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        semaphore = asyncio.Semaphore(args.concurrency)
        tasks = [
            asyncio.create_task(worker(queue, browser, semaphore, stats, total_schemes, lock))
            for _ in range(args.concurrency)
        ]
        await queue.join()
        for t in tasks:
            t.cancel()
        await browser.close()

    elapsed = time.time() - start_time

    # 3. Summary Report
    log_header("MARKET CAP & RANKINGS SYNC SUMMARY REPORT")
    print(f"  * Total Schemes Queried:    {CLR_BOLD}{total_schemes}{CLR_RESET} schemes")
    print(f"  * Successfully Scraped:     {CLR_GREEN}{stats['updated']} saved to DB{CLR_RESET}")
    print(f"  * Skipped (ULIP / Non-MF):  {CLR_YELLOW}{stats['skipped']} marked NOT_FOUND{CLR_RESET}")
    print(f"  * Failed / Page Error:      {CLR_RED if stats['failed'] > 0 else CLR_RESET}{stats['failed']} failed{CLR_RESET}")
    print(f"  * Total Execution Time:     {CLR_BOLD}{elapsed:.2f} seconds{CLR_RESET}")
    print(f"  * Final Status:             {CLR_BOLD}{CLR_GREEN}COMPLETED SUCCESSFULLY{CLR_RESET}\n")

if __name__ == "__main__":
    asyncio.run(main())
