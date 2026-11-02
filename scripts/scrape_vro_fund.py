#!/usr/bin/env python3
"""
Python Playwright scraper for Mutual Fund Analytics from Value Research Online (VRO).
Extracts:
1. Risk measures comparison table (Mean Return, Std Dev, Sharpe, Sortino, Beta, Alpha, Rank in Category, Funds in Category)
2. Return Over Time table (YTD, 1D, 1M, 3M, 6M, 1Y, 3Y, 5Y, 7Y, 10Y vs Benchmark and Category Average)
3. Portfolio Breakdown (Sector Distribution: Fund % vs Category %, Top 25 Company Holdings with P/E and % Assets)
Saves results into PostgreSQL (portfolio.watchlist_fund_analytics and portfolio.watchlist_schemes).
"""

import sys
import os
import argparse
import asyncio
import json
import re
from datetime import datetime
import time
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
    
    # Strip query parameters like ?schema=portfolio
    clean_url = db_url.split("?")[0]
    return psycopg2.connect(clean_url)

def get_watchlist_scheme_meta(scheme_code: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT scheme_code, scheme_name, category, vro_url FROM portfolio.watchlist_schemes WHERE scheme_code = %s",
        (scheme_code,)
    )
    row = cur.fetchone()
    if row:
        conn.close()
        return {
            "schemeCode": row[0],
            "schemeName": row[1],
            "category": row[2],
            "vroUrl": row[3],
        }
    
    # Check watchlist_fund_analytics for saved vro_url
    cur.execute(
        "SELECT scheme_code, scheme_name, category_name, vro_url FROM portfolio.watchlist_fund_analytics WHERE scheme_code = %s",
        (scheme_code,)
    )
    row_ana = cur.fetchone()
    if row_ana and row_ana[3]:
        conn.close()
        return {
            "schemeCode": row_ana[0],
            "schemeName": row_ana[1],
            "category": row_ana[2],
            "vroUrl": row_ana[3],
        }

    # Fallback to other scheme tables if not yet in watchlist_schemes
    for tbl in ["schemes", "zerodha_schemes"]:
        try:
            cur.execute(f"SELECT scheme_code_api, name, category, vro_url FROM portfolio.{tbl} WHERE scheme_code_api = %s", (scheme_code,))
            r = cur.fetchone()
            if r:
                conn.close()
                return {
                    "schemeCode": r[0],
                    "schemeName": r[1],
                    "category": r[2],
                    "vroUrl": r[3] or (row_ana[3] if row_ana else None),
                }
        except Exception:
            pass

    conn.close()
    return None

def save_vro_url(scheme_code: str, vro_url: str, scheme_name: str = None, category_name: str = None):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # 1. Update watchlist_fund_analytics
        cur.execute("""
            INSERT INTO portfolio.watchlist_fund_analytics (scheme_code, scheme_name, category_name, vro_url, updated_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (scheme_code) DO UPDATE SET
                vro_url = EXCLUDED.vro_url,
                scheme_name = COALESCE(NULLIF(EXCLUDED.scheme_name, ''), portfolio.watchlist_fund_analytics.scheme_name),
                category_name = COALESCE(NULLIF(EXCLUDED.category_name, ''), portfolio.watchlist_fund_analytics.category_name),
                updated_at = NOW();
        """, (scheme_code, scheme_name or f"Scheme {scheme_code}", category_name or "", vro_url))

        # 2. Update schemes (CAS)
        cur.execute("""
            UPDATE portfolio.schemes
            SET vro_url = %s, updated_at = NOW()
            WHERE scheme_code_api = %s;
        """, (vro_url, scheme_code))

        # 3. Update zerodha_schemes
        cur.execute("""
            UPDATE portfolio.zerodha_schemes
            SET vro_url = %s, updated_at = NOW()
            WHERE scheme_code_api = %s;
        """, (vro_url, scheme_code))

        # 4. Update watchlist_schemes
        cur.execute("""
            UPDATE portfolio.watchlist_schemes 
            SET vro_url = %s, updated_at = NOW() 
            WHERE scheme_code = %s OR scheme_code = %s;
        """, (vro_url, scheme_code, f"w_{scheme_code}"))

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error saving vro_url to database: {e}", file=sys.stderr)

def save_vro_analytics(scheme_code: str, scheme_name: str, category_name: str, vro_url: str, risk_data: dict, returns_data: dict, portfolio_data: dict):
    conn = get_db_connection()
    cur = conn.cursor()
    now_iso = datetime.now().isoformat()

    # Extract benchmark name from VRO rows if available
    vro_benchmark = None
    if risk_data and "rows" in risk_data:
        for r in risk_data.get("rows", []):
            lbl = r.get("label", "")
            if lbl.startswith("B:") or "benchmark" in lbl.lower():
                vro_benchmark = lbl.replace("B:", "").strip()
                break
    if not vro_benchmark and returns_data and "rows" in returns_data:
        for r in returns_data.get("rows", []):
            lbl = r.get("label", "")
            if lbl.startswith("B:") or "benchmark" in lbl.lower():
                vro_benchmark = lbl.replace("B:", "").strip()
                break

    # 1. Update vro_url and benchmark_name on watchlist_schemes
    cur.execute("""
        UPDATE portfolio.watchlist_schemes 
        SET 
            vro_url = COALESCE(%s, vro_url),
            benchmark_name = COALESCE(benchmark_name, %s),
            updated_at = NOW() 
        WHERE scheme_code = %s;
    """, (vro_url, vro_benchmark, scheme_code))
    
    # 2. Extract marketCap if available from VRO portfolio
    vro_market_cap = portfolio_data.get("marketCap") if portfolio_data else None
    vro_mkt_cap_json = json.dumps(vro_market_cap) if (vro_market_cap and (
        (vro_market_cap.get("largeCap") or 0) > 0 or 
        (vro_market_cap.get("midCap") or 0) > 0 or 
        (vro_market_cap.get("smallCap") or 0) > 0
    )) else None

    # 3. Upsert into watchlist_fund_analytics
    cur.execute("""
        INSERT INTO portfolio.watchlist_fund_analytics (
            scheme_code,
            scheme_name,
            category_name,
            vro_url,
            vro_risk_data,
            vro_returns_data,
            vro_portfolio_data,
            market_cap_data,
            last_vro_synced_at,
            updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (scheme_code) DO UPDATE SET
            vro_url = COALESCE(EXCLUDED.vro_url, watchlist_fund_analytics.vro_url),
            vro_risk_data = COALESCE(EXCLUDED.vro_risk_data, watchlist_fund_analytics.vro_risk_data),
            vro_returns_data = COALESCE(EXCLUDED.vro_returns_data, watchlist_fund_analytics.vro_returns_data),
            vro_portfolio_data = CASE 
                WHEN EXCLUDED.vro_portfolio_data IS NOT NULL 
                     AND jsonb_array_length(COALESCE(EXCLUDED.vro_portfolio_data::jsonb->'sectors', '[]'::jsonb)) > 0
                THEN EXCLUDED.vro_portfolio_data
                WHEN watchlist_fund_analytics.vro_portfolio_data IS NOT NULL
                     AND jsonb_array_length(COALESCE(watchlist_fund_analytics.vro_portfolio_data::jsonb->'sectors', '[]'::jsonb)) > 0
                THEN watchlist_fund_analytics.vro_portfolio_data
                ELSE COALESCE(EXCLUDED.vro_portfolio_data, watchlist_fund_analytics.vro_portfolio_data)
            END,
            market_cap_data = CASE 
                WHEN EXCLUDED.market_cap_data IS NOT NULL AND (
                    watchlist_fund_analytics.market_cap_data IS NULL 
                    OR watchlist_fund_analytics.market_cap_data = ''
                    OR (
                        watchlist_fund_analytics.market_cap_data LIKE '%%"largeCap": 0%%' 
                        AND watchlist_fund_analytics.market_cap_data LIKE '%%"midCap": 0%%' 
                        AND watchlist_fund_analytics.market_cap_data LIKE '%%"smallCap": 0%%'
                    )
                ) THEN EXCLUDED.market_cap_data
                ELSE watchlist_fund_analytics.market_cap_data
            END,
            last_vro_synced_at = EXCLUDED.last_vro_synced_at,
            updated_at = NOW();
    """, (
        scheme_code,
        scheme_name,
        category_name,
        vro_url,
        json.dumps(risk_data) if risk_data else None,
        json.dumps(returns_data) if returns_data else None,
        json.dumps(portfolio_data) if portfolio_data else None,
        vro_mkt_cap_json,
        now_iso
    ))
    
    cur.execute("""
        UPDATE portfolio.schemes 
        SET vro_url = COALESCE(%s, vro_url), updated_at = NOW() 
        WHERE scheme_code_api = %s;
    """, (vro_url, scheme_code))

    cur.execute("""
        UPDATE portfolio.zerodha_schemes 
        SET vro_url = COALESCE(%s, vro_url), updated_at = NOW() 
        WHERE scheme_code_api = %s;
    """, (vro_url, scheme_code))
    
    conn.commit()
    cur.close()
    conn.close()

async def scrape_risk(context, clean_base: str):
    page = await context.new_page()
    await page.route(
        "**/{gtm,analytics,taboola,criteo,doubleclick,adx,facebook,twitter,smartadserver,rubiconproject,casalemedia}**",
        lambda route: route.abort()
    )
    try:
        await page.goto(clean_base + "#risk", wait_until="domcontentloaded", timeout=25000)
        try:
            await page.wait_for_selector("table", timeout=12000)
        except Exception:
            pass
        await page.wait_for_timeout(2500)
        
        # Risk classification
        risk_text = await page.evaluate('''() => {
            const bodyText = document.body.innerText;
            const match = bodyText.match(/This fund has been classified as having\\s+([A-Za-z\\s]+Risk)/i);
            if (match) return match[1].trim();
            const match2 = bodyText.match(/has been classified as having\\s+([A-Za-z\\s]+)/i);
            if (match2) return match2[1].trim();
            return "Very High Risk";
        }''')

        risk_as_of = await page.evaluate('''() => {
            const text = document.body.innerText;
            const m = text.match(/As on\\s+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/);
            return m ? m[1] : null;
        }''')

        tables = await page.eval_on_selector_all('table', '''tables => tables.map(t => {
            return Array.from(t.querySelectorAll("tr")).map(tr => 
                Array.from(tr.querySelectorAll("th, td")).map(c => c.innerText.trim())
            );
        })''')

        risk_rows = []
        for t in tables:
            if not t or len(t) < 2:
                continue
            header_str = " ".join(t[0]).lower()
            if "mean return" in header_str or "std dev" in header_str or "sharpe" in header_str:
                for r in t[1:]:
                    if len(r) >= 7:
                        row_label = r[0] or (r[1] if len(r) > 7 else "Measure")
                        risk_rows.append({
                            "label": row_label,
                            "meanReturn": r[1] if len(r) > 1 else "",
                            "stdDev": r[2] if len(r) > 2 else "",
                            "sharpe": r[3] if len(r) > 3 else "",
                            "sortino": r[4] if len(r) > 4 else "",
                            "beta": r[5] if len(r) > 5 else "",
                            "alpha": r[6] if len(r) > 6 else "",
                            "informationRatio": r[7] if len(r) > 7 else ""
                        })
                break

        await page.close()
        if risk_rows:
            return {
                "riskClassification": risk_text or "Very High Risk",
                "asOfDate": risk_as_of,
                "rows": risk_rows
            }
    except Exception as e:
        print(f"Error in scrape_risk: {e}", file=sys.stderr)
        try:
            await page.close()
        except Exception:
            pass
    return None

async def scrape_performance(context, clean_base: str):
    page = await context.new_page()
    await page.route(
        "**/{gtm,analytics,taboola,criteo,doubleclick,adx,facebook,twitter,smartadserver,rubiconproject,casalemedia}**",
        lambda route: route.abort()
    )
    try:
        await page.goto(clean_base + "#performance", wait_until="domcontentloaded", timeout=25000)
        try:
            await page.wait_for_selector("table", timeout=12000)
        except Exception:
            pass
        await page.wait_for_timeout(2000)

        perf_as_of = await page.evaluate('''() => {
            const text = document.body.innerText;
            const m = text.match(/As on\\s+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/);
            return m ? m[1] : null;
        }''')

        tables = await page.eval_on_selector_all('table', '''tables => tables.map(t => {
            return Array.from(t.querySelectorAll("tr")).map(tr => 
                Array.from(tr.querySelectorAll("th, td")).map(c => c.innerText.trim())
            );
        })''')

        perf_rows = []
        for t in tables:
            if not t or len(t) < 2:
                continue
            header_str = " ".join(t[0])
            if "YTD" in header_str and "1Y" in header_str:
                for r in t[1:]:
                    if len(r) >= 11:
                        perf_rows.append({
                            "label": r[0],
                            "ytd": r[1],
                            "oneDay": r[2],
                            "oneMonth": r[3],
                            "threeMonth": r[4],
                            "sixMonth": r[5],
                            "oneYear": r[6],
                            "threeYear": r[7],
                            "fiveYear": r[8],
                            "sevenYear": r[9],
                            "tenYear": r[10]
                        })
                break

        await page.close()
        if perf_rows:
            return {
                "asOfDate": perf_as_of,
                "rows": perf_rows
            }
    except Exception as e:
        print(f"Error in scrape_performance: {e}", file=sys.stderr)
        try:
            await page.close()
        except Exception:
            pass
    return None

async def scrape_portfolio(context, clean_base: str):
    page = await context.new_page()
    await page.route(
        "**/{gtm,analytics,taboola,criteo,doubleclick,adx,facebook,twitter,smartadserver,rubiconproject,casalemedia,amazon-adsystem,pubmatic,openx}**",
        lambda route: route.abort()
    )
    try:
        await page.goto(clean_base + "#fund-portfolio", wait_until="domcontentloaded", timeout=30000)
        try:
            # Wait specifically for Sector or Company table to hydrate in DOM
            await page.wait_for_function("""() => {
                const tables = Array.from(document.querySelectorAll('table'));
                return tables.some(t => {
                    const txt = t.innerText;
                    return (txt.includes('Sector') && txt.includes('Fund')) || 
                           (txt.includes('Company Name') && (txt.includes('P/E') || txt.includes('% Assets') || txt.includes('Holding Trend')));
                });
            }""", timeout=15000)
        except Exception:
            pass
        await page.wait_for_timeout(2000)

        port_as_of = await page.evaluate('''() => {
            const text = document.body.innerText;
            const m = text.match(/As on\\s+([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/);
            return m ? m[1] : null;
        }''')

        tables = await page.eval_on_selector_all('table', '''tables => tables.map(t => {
            return Array.from(t.querySelectorAll("tr")).map(tr => 
                Array.from(tr.querySelectorAll("th, td")).map(c => c.innerText.trim())
            );
        })''')

        sectors = []
        full_holdings = []
        mini_holdings = []

        for t in tables:
            if not t or len(t) < 2:
                continue
            header_str = " ".join(t[0])
            
            # Sector Allocation table: Sector | Fund (%) | Category (%)
            if "Sector" in header_str and "Fund" in header_str:
                for r in t[1:]:
                    if len(r) >= 3 and r[0] != "Sector":
                        try:
                            f_pct = float(r[1].replace("%", "").strip())
                            c_pct = float(r[2].replace("%", "").strip())
                            sectors.append({
                                "sector": r[0].strip(),
                                "fundPct": f_pct,
                                "categoryPct": c_pct
                            })
                        except ValueError:
                            pass
            
            # Full Top Holdings table: Company Name | Sector | P/E Ratio | % Assets | Holding Trend
            if "Company Name" in header_str and ("P/E" in header_str or "% Assets" in header_str or "Holding Trend" in header_str):
                for r in t[1:]:
                    if len(r) >= 4 and r[0] not in ("Company Name", "Company"):
                        try:
                            pe_str = r[2].replace(",", "").strip()
                            pe_val = float(pe_str) if pe_str and pe_str not in ("--", "-", "N/A") else None
                            asset_pct = float(r[3].replace("%", "").strip())
                            sector_name = r[1].strip() or None
                            full_holdings.append({
                                "companyName": r[0].strip(),
                                "sector": sector_name,
                                "peRatio": pe_val,
                                "assetPct": asset_pct
                            })
                        except (ValueError, IndexError):
                            pass

            # Mini Top Holdings widget on Overview: Company | Percentage of Portfolio
            elif "Company" in header_str and ("Percentage of Portfolio" in header_str or "Portfolio" in header_str):
                for r in t[1:]:
                    if len(r) >= 2 and r[0] not in ("Company Name", "Company"):
                        try:
                            asset_pct = float(r[1].replace("%", "").strip())
                            mini_holdings.append({
                                "companyName": r[0].strip(),
                                "sector": None,
                                "peRatio": None,
                                "assetPct": asset_pct
                            })
                        except (ValueError, IndexError):
                            pass

        # Use full holdings if available; only fallback to mini widget if full table absent
        raw_holdings = full_holdings if full_holdings else mini_holdings
        seen_companies = set()
        top_holdings = []
        for h in raw_holdings:
            norm_name = re.sub(r'[^a-zA-Z0-9]', '', h["companyName"]).lower()
            if norm_name and norm_name not in seen_companies:
                seen_companies.add(norm_name)
                top_holdings.append(h)

        # Extract Market Cap Split and Avg Market Cap from Portfolio Aggregates
        mkt_cap_data = None
        try:
            full_text = await page.evaluate("() => document.body.innerText")
            l_match = re.search(r'Large(?:\s+Cap)?\s+([\d\.]+)%', full_text, re.I)
            m_match = re.search(r'Mid(?:\s+Cap)?\s+([\d\.]+)%', full_text, re.I)
            s_match = re.search(r'Small(?:\s+Cap)?\s+([\d\.]+)%', full_text, re.I)
            avg_match = re.search(r'Avg\s*Mkt\s*Cap\s+₹?\s*([\d,]+(?:\.\d+)?)\s*Cr', full_text, re.I)

            if l_match or m_match or s_match or avg_match:
                l_val = float(l_match.group(1)) if l_match else 0.0
                m_val = float(m_match.group(1)) if m_match else 0.0
                s_val = float(s_match.group(1)) if s_match else 0.0
                avg_val = float(avg_match.group(1).replace(",", "")) if avg_match else None
                mkt_cap_data = {
                    "largeCap": l_val,
                    "midCap": m_val,
                    "smallCap": s_val,
                    "avgMktCapCr": avg_val
                }
        except Exception as e:
            print(f"Error extracting market cap from VRO portfolio: {e}", file=sys.stderr)

        await page.close()
        return {
            "sectors": sectors,
            "topHoldings": top_holdings,
            "marketCap": mkt_cap_data,
            "asOfDate": port_as_of
        }
    except Exception as e:
        print(f"Error in scrape_portfolio: {e}", file=sys.stderr)
        try:
            await page.close()
        except Exception:
            pass
    return {
        "sectors": [],
        "topHoldings": [],
        "marketCap": None,
        "asOfDate": None
    }

def clean_query_for_vro(name: str) -> str:
    q = name
    q = re.sub(r'\bSL\b', 'Sun Life', q)
    q = re.sub(r'\bPru\b', 'Prudential', q)
    q = re.sub(r'\bST\b', 'Short Term', q)
    q = re.sub(r'\bRet\b', 'Retail', q)
    q = re.sub(r'\bIns\b', 'Institutional', q)
    q = re.sub(r'\bMidcap\b', 'Mid Cap', q, flags=re.I)
    q = re.sub(r'\bMulticap\b', 'Multi Cap', q, flags=re.I)
    q = re.sub(r'\bFlexicap\b', 'Flexi Cap', q, flags=re.I)
    q = re.sub(r'\bSmallcap\b', 'Small Cap', q, flags=re.I)
    q = re.sub(r'\bLargecap\b', 'Large Cap', q, flags=re.I)
    q = re.sub(r'[\(\)]', ' ', q)
    q = re.sub(r'\b(reg|regular|direct|dir|plan|growth|g|idcw|dividend|option)\b', ' ', q, flags=re.I)
    q = re.sub(r'[-–—&]', ' ', q)
    q = re.sub(r'\s+', ' ', q).strip()
    return q

def score_candidate(link_href: str, scheme_name: str) -> int:
    href_lower = link_href.lower()
    if not re.search(r'/funds/\d+/[a-z0-9-]+', href_lower):
        return -999
    if any(x in href_lower for x in ['fund-compare', 'best-mutual-funds', 'selector', 'fund-category', 'new-fund-offers', 'etf', 'hindi']):
        return -999

    href_norm = re.sub(r'[^a-z0-9]', '', href_lower)
    clean_scheme = clean_query_for_vro(scheme_name).lower()
    words = [re.sub(r'[^a-z0-9]', '', w) for w in clean_scheme.split() if len(w) >= 3 and w.lower() not in {'fund', 'the', 'and'}]
    
    score = 0
    matched = 0
    for w in words:
        if w in href_norm:
            score += 5
            matched += 1
            
    if matched == len(words) and len(words) > 0:
        score += 20
    elif matched >= max(1, len(words) - 1) and len(words) >= 2:
        score += 10
        
    is_direct = bool(re.search(r'\b(direct|dir)\b', scheme_name, re.I))
    if is_direct:
        if 'direct-plan' in href_lower:
            score += 5
        elif 'regular-plan' in href_lower:
            score -= 5
    else:
        if 'regular-plan' in href_lower:
            score += 5
        elif 'direct-plan' in href_lower:
            score -= 1
            
    return score

async def create_stealth_context(browser):
    ctx = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    await ctx.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """)
    return ctx

async def auto_discover_vro_url(browser, scheme_name: str):
    """
    Searches Value Research Online for the given fund name and returns the best matching fund URL.
    """
    clean_query = clean_query_for_vro(scheme_name)
    context = await create_stealth_context(browser)
    page = await context.new_page()
    await page.route(
        "**/{gtm,analytics,taboola,criteo,doubleclick,adx,facebook,twitter,smartadserver,rubiconproject,casalemedia,amazon-adsystem,pubmatic,openx}**",
        lambda route: route.abort()
    )
    
    try:
        import urllib.parse
        search_url = f"https://www.valueresearchonline.com/search/search?q={urllib.parse.quote(clean_query)}"
        print(f"Auto-discovering VRO URL for '{scheme_name}' via {search_url}...", file=sys.stderr)
        await page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2500)
        
        links = await page.evaluate(r'''() => {
            return Array.from(document.querySelectorAll('a'))
                .map(a => a.href)
                .filter(h => /\/funds\/\d+\//.test(h));
        }''')
        await page.close()
        await context.close()
        
        candidates = []
        seen = set()
        for l in links:
            clean = l.split("?")[0].split("#")[0].rstrip("/") + "/"
            if clean not in seen and "hindi" not in clean:
                seen.add(clean)
                s = score_candidate(clean, scheme_name)
                if s > 0:
                    candidates.append((s, clean))
        candidates.sort(key=lambda x: x[0], reverse=True)
        
        if candidates and candidates[0][0] >= 15:
            best_url = candidates[0][1]
            print(f"Auto-discovered VRO URL (Score {candidates[0][0]}): {best_url}", file=sys.stderr)
            return best_url
    except Exception as e:
        print(f"Error during VRO URL auto-discovery: {e}", file=sys.stderr)
        try:
            await page.close()
            await context.close()
        except Exception:
            pass
            
    return None

async def scrape_vro_fund(vro_url: str, browser=None):
    clean_base = vro_url.split("#")[0].rstrip("/") + "/"
    owns_browser = False
    
    if browser is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        owns_browser = True
        
    try:
        ctx_risk = await create_stealth_context(browser)
        risk_res = await scrape_risk(ctx_risk, clean_base)
        await ctx_risk.close()
        
        ctx_perf = await create_stealth_context(browser)
        perf_res = await scrape_performance(ctx_perf, clean_base)
        await ctx_perf.close()
        
        ctx_port = await create_stealth_context(browser)
        port_res = await scrape_portfolio(ctx_port, clean_base)
        await ctx_port.close()
        
        return {
            "risk": risk_res,
            "returns": perf_res,
            "portfolio": port_res
        }
    finally:
        if owns_browser:
            await browser.close()
            await p.stop()

async def vro_worker(queue, browser, semaphore, stats, total_count, lock, force=False):
    while True:
        try:
            s = queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        code = s["schemeCode"]
        name = s["schemeName"]
        cat = s.get("category") or ""
        vro_url = s.get("vroUrl")
        last_synced = s.get("lastSyncedAt")

        async with lock:
            stats["processed"] += 1
            curr_idx = stats["processed"]
            pct = (curr_idx / total_count) * 100 if total_count > 0 else 100.0

        prefix = f"  [{curr_idx:3d}/{total_count:3d}] ({pct:5.1f}%) {CLR_BOLD}{code}{CLR_RESET} {name[:34]:<34}"

        # Check if already fresh (within 24 hours) unless force is requested
        if not force and last_synced:
            try:
                sync_dt = datetime.fromisoformat(str(last_synced))
                age_hours = (datetime.now() - sync_dt).total_seconds() / 3600.0
                if age_hours < 24.0:
                    print(f"{prefix} -> {CLR_GREEN}[FRESH]{CLR_RESET} Synced {age_hours:.1f}h ago (use --force to re-sync)")
                    async with lock:
                        stats["fresh"] += 1
                    queue.task_done()
                    continue
            except Exception:
                pass

        async with semaphore:
            # 1. URL Resolution / Auto-Discovery
            if not vro_url:
                vro_url = await auto_discover_vro_url(browser, name)
                if vro_url:
                    save_vro_url(code, vro_url, name, cat)
                else:
                    print(f"{prefix} -> {CLR_RED}[NO URL]{CLR_RESET} Could not auto-discover VRO URL")
                    async with lock:
                        stats["failed"] += 1
                    queue.task_done()
                    continue

            # 2. Scrape VRO Fund Analytics
            try:
                res = await asyncio.wait_for(
                    scrape_vro_fund(vro_url, browser=browser),
                    timeout=55.0
                )
            except Exception as e:
                print(f"{prefix} -> {CLR_RED}[TIMEOUT/ERROR]{CLR_RESET} {e}")
                async with lock:
                    stats["failed"] += 1
                queue.task_done()
                continue

            has_data = bool(
                res.get("risk") or 
                res.get("returns") or 
                (res.get("portfolio") and (
                    res["portfolio"].get("topHoldings") or 
                    res["portfolio"].get("sectors") or 
                    res["portfolio"].get("marketCap")
                ))
            )

            if has_data:
                save_vro_analytics(
                    scheme_code=code,
                    scheme_name=name,
                    category_name=cat,
                    vro_url=vro_url,
                    risk_data=res.get("risk"),
                    returns_data=res.get("returns"),
                    portfolio_data=res.get("portfolio")
                )
                async with lock:
                    stats["updated"] += 1

                # Format informative summary badges
                details_parts = []
                r_rows = len(res.get("risk", {}).get("rows", [])) if res.get("risk") else 0
                if r_rows:
                    details_parts.append(f"Risk: {r_rows} measures")

                ret_rows = len(res.get("returns", {}).get("rows", [])) if res.get("returns") else 0
                if ret_rows:
                    details_parts.append(f"Returns: {ret_rows} horizons")

                sec_cnt = len(res.get("portfolio", {}).get("sectors", [])) if res.get("portfolio") else 0
                if sec_cnt:
                    details_parts.append(f"Sectors: {sec_cnt}")

                hold_cnt = len(res.get("portfolio", {}).get("topHoldings", [])) if res.get("portfolio") else 0
                if hold_cnt:
                    details_parts.append(f"Top Holdings: {hold_cnt}")

                mc = res.get("portfolio", {}).get("marketCap") if res.get("portfolio") else None
                if mc and (mc.get("largeCap") or mc.get("midCap") or mc.get("smallCap")):
                    l_val = mc.get("largeCap", 0) or 0
                    m_val = mc.get("midCap", 0) or 0
                    s_val = mc.get("smallCap", 0) or 0
                    details_parts.append(f"Cap: L:{l_val:.0f}% M:{m_val:.0f}% S:{s_val:.0f}%")

                detail_str = " | ".join(details_parts) if details_parts else "Analytics Saved"
                print(f"{prefix} -> {CLR_GREEN}[SAVED]{CLR_RESET} {detail_str}")
            else:
                print(f"{prefix} -> {CLR_YELLOW}[NO DATA]{CLR_RESET} Empty tables returned from VRO")
                async with lock:
                    stats["failed"] += 1

        queue.task_done()

def cleanup_duplicate_holdings(conn):
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT scheme_code, vro_portfolio_data
            FROM portfolio.watchlist_fund_analytics
            WHERE vro_portfolio_data IS NOT NULL;
        """)
        rows = cur.fetchall()
        cleaned_count = 0
        for code, port_raw in rows:
            port = port_raw if isinstance(port_raw, dict) else json.loads(port_raw)
            holdings = port.get("topHoldings", [])
            if not holdings or len(holdings) <= 1:
                continue

            seen = set()
            deduped = []
            has_dups = False
            for h in holdings:
                norm = re.sub(r'[^a-zA-Z0-9]', '', h.get("companyName", "")).lower()
                if norm in seen:
                    has_dups = True
                else:
                    seen.add(norm)
                    deduped.append(h)

            if has_dups or len(deduped) != len(holdings):
                port["topHoldings"] = deduped
                cur.execute("""
                    UPDATE portfolio.watchlist_fund_analytics
                    SET vro_portfolio_data = %s, updated_at = NOW()
                    WHERE scheme_code = %s;
                """, (json.dumps(port), code))
                cleaned_count += 1
        conn.commit()
        if cleaned_count > 0:
            print(f"  {CLR_GREEN}✓{CLR_RESET} Cleaned duplicate holdings in {CLR_BOLD}{cleaned_count}{CLR_RESET} database records")
    except Exception as e:
        print(f"  {CLR_YELLOW}[WARN]{CLR_RESET} Error during holdings cleanup: {e}", file=sys.stderr)
    finally:
        cur.close()

async def main():
    parser = argparse.ArgumentParser(description="Scrape Mutual Fund Analytics from Value Research Online")
    parser.add_argument("--scheme-code", help="Specific AMFI scheme code (e.g. 118989)")
    parser.add_argument("--vro-url", help="Direct URL to Value Research fund page")
    parser.add_argument("--active-only", action="store_true", help="Scrape only active mutual funds from CAS & Zerodha (default)")
    parser.add_argument("--sync-all", action="store_true", help="Sync all funds currently having a VRO URL")
    parser.add_argument("--refetch-incomplete", action="store_true", help="Force refetch of schemes with missing/incomplete portfolio or sectors")
    parser.add_argument("--force", action="store_true", help="Re-sync even if already synced within 24 hours")
    parser.add_argument("--concurrency", type=int, default=3, help="Number of concurrent fund syncs (default: 3)")
    args = parser.parse_args()

    start_time = time.time()
    log_header("VALUE RESEARCH ONLINE (VRO) MUTUAL FUND ANALYTICS SYNC ENGINE")

    # 1. Discover Schemes
    log_section("1. DISCOVERING MUTUAL FUND SCHEMES")
    conn = get_db_connection()
    cleanup_duplicate_holdings(conn)
    cur = conn.cursor()
    schemes_to_scrape = []

    try:
        if args.scheme_code:
            clean_code = args.scheme_code.replace("w_", "").replace("sold_", "").strip()
            cur.execute("""
                SELECT s.scheme_code_api, s.name, s.category,
                       COALESCE(wfa.vro_url, s.vro_url) as vro_url,
                       wfa.last_vro_synced_at
                FROM portfolio.schemes s
                LEFT JOIN portfolio.watchlist_fund_analytics wfa ON s.scheme_code_api = wfa.scheme_code
                WHERE s.scheme_code_api = %s
                UNION
                SELECT zs.scheme_code_api, zs.name, zs.category,
                       COALESCE(wfa.vro_url, zs.vro_url) as vro_url,
                       wfa.last_vro_synced_at
                FROM portfolio.zerodha_schemes zs
                LEFT JOIN portfolio.watchlist_fund_analytics wfa ON zs.scheme_code_api = wfa.scheme_code
                WHERE zs.scheme_code_api = %s
                UNION
                SELECT ws.scheme_code, ws.scheme_name, ws.category,
                       COALESCE(wfa.vro_url, ws.vro_url) as vro_url,
                       wfa.last_vro_synced_at
                FROM portfolio.watchlist_schemes ws
                LEFT JOIN portfolio.watchlist_fund_analytics wfa ON ws.scheme_code = wfa.scheme_code
                WHERE ws.scheme_code = %s
            """, (clean_code, clean_code, clean_code))
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({
                    "schemeCode": r[0],
                    "schemeName": r[1],
                    "category": r[2],
                    "vroUrl": args.vro_url or r[3],
                    "lastSyncedAt": r[4]
                })
            if not schemes_to_scrape:
                # AMFI fallback lookup
                try:
                    import urllib.request
                    req = urllib.request.Request(f"https://api.mfapi.in/mf/{clean_code}", headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        data = json.loads(resp.read().decode())
                        if data and "meta" in data:
                            schemes_to_scrape.append({
                                "schemeCode": clean_code,
                                "schemeName": data["meta"].get("scheme_name"),
                                "category": data["meta"].get("scheme_category"),
                                "vroUrl": args.vro_url or None,
                                "lastSyncedAt": None
                            })
                except Exception as amfi_err:
                    print(f"  {CLR_YELLOW}[WARN]{CLR_RESET} AMFI fallback lookup failed: {amfi_err}")
        elif args.sync_all:
            cur.execute("""
                SELECT scheme_code, scheme_name, category_name, vro_url, last_vro_synced_at
                FROM portfolio.watchlist_fund_analytics
                WHERE vro_url IS NOT NULL AND vro_url != ''
                ORDER BY scheme_name;
            """)
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({
                    "schemeCode": r[0],
                    "schemeName": r[1],
                    "category": r[2],
                    "vroUrl": r[3],
                    "lastSyncedAt": r[4]
                })
        elif args.refetch_incomplete:
            args.force = True
            cur.execute("""
                SELECT scheme_code, scheme_name, category_name, vro_url, last_vro_synced_at
                FROM portfolio.watchlist_fund_analytics
                WHERE vro_url IS NOT NULL AND vro_url != ''
                  AND (
                    vro_portfolio_data IS NULL 
                    OR jsonb_array_length(COALESCE(vro_portfolio_data::jsonb->'sectors', '[]'::jsonb)) = 0
                    OR jsonb_array_length(COALESCE(vro_portfolio_data::jsonb->'topHoldings', '[]'::jsonb)) < 10
                  )
                  AND category_name NOT ILIKE '%Liquid%' 
                  AND category_name NOT ILIKE '%Overnight%' 
                  AND category_name NOT ILIKE '%Money Market%' 
                  AND category_name NOT ILIKE '%Ultra Short%' 
                  AND category_name NOT ILIKE '%Low Duration%' 
                  AND category_name NOT ILIKE '%Short Duration%' 
                  AND category_name NOT ILIKE '%Medium Duration%' 
                  AND category_name NOT ILIKE '%Credit Risk%' 
                  AND category_name NOT ILIKE '%Banking and PSU%' 
                  AND category_name NOT ILIKE '%Gilt%' 
                  AND category_name NOT ILIKE '%Floater%'
                ORDER BY scheme_name;
            """)
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({
                    "schemeCode": r[0],
                    "schemeName": r[1],
                    "category": r[2],
                    "vroUrl": r[3],
                    "lastSyncedAt": r[4]
                })
        else:
            # Default or --active-only:
            # Discover active mutual fund schemes across CAS & Zerodha
            cur.execute("""
                WITH latest_family_reports AS (
                    SELECT DISTINCT ON (h.member_id) r.id
                    FROM portfolio.reports r
                    JOIN portfolio.holdings_snapshot h ON h.report_id = r.id
                    ORDER BY h.member_id, r.as_of_date DESC
                ),
                latest_zerodha_reports AS (
                    SELECT DISTINCT ON (client_id) id
                    FROM portfolio.zerodha_reports
                    ORDER BY client_id, as_of_date DESC
                )
                SELECT DISTINCT s.scheme_code_api, s.name, s.category,
                       COALESCE(wfa.vro_url, s.vro_url) as vro_url,
                       wfa.last_vro_synced_at
                FROM portfolio.holdings_snapshot h
                JOIN latest_family_reports lfr ON h.report_id = lfr.id
                JOIN portfolio.schemes s ON h.scheme_id = s.id
                LEFT JOIN portfolio.watchlist_fund_analytics wfa ON s.scheme_code_api = wfa.scheme_code
                WHERE (h.balance_units > 0.0001 OR h.current_value > 0)
                  AND s.scheme_code_api ~ '^[0-9]{5,6}$'
                UNION
                SELECT DISTINCT zs.scheme_code_api, zs.name, zs.category,
                       COALESCE(wfa.vro_url, zs.vro_url) as vro_url,
                       wfa.last_vro_synced_at
                FROM portfolio.zerodha_holdings zh
                JOIN latest_zerodha_reports lzr ON zh.report_id = lzr.id
                JOIN portfolio.zerodha_schemes zs ON zh.scheme_id = zs.id
                LEFT JOIN portfolio.watchlist_fund_analytics wfa ON zs.scheme_code_api = wfa.scheme_code
                WHERE zh.quantity > 0.0001
                  AND (zs.holding_type = 'mutual_fund' OR zs.scheme_code_api ~ '^[0-9]{5,6}$')
                ORDER BY category, name;
            """)
            rows = cur.fetchall()
            for r in rows:
                schemes_to_scrape.append({
                    "schemeCode": r[0],
                    "schemeName": r[1],
                    "category": r[2],
                    "vroUrl": r[3],
                    "lastSyncedAt": r[4]
                })
    finally:
        cur.close()
        conn.close()

    total_schemes = len(schemes_to_scrape)
    with_urls = sum(1 for s in schemes_to_scrape if s.get("vroUrl"))
    print(f"  {CLR_CYAN}✓{CLR_RESET} Target Mutual Fund Schemes: {CLR_BOLD}{total_schemes}{CLR_RESET} schemes selected")
    print(f"  {CLR_CYAN}✓{CLR_RESET} Known VRO URLs Available:   {CLR_BOLD}{with_urls}/{total_schemes}{CLR_RESET} schemes")
    print(f"  {CLR_CYAN}✓{CLR_RESET} Scraping Concurrency:       {CLR_BOLD}{args.concurrency}x parallel{CLR_RESET}")

    if not schemes_to_scrape:
        print(f"  {CLR_YELLOW}No matching mutual fund schemes found to sync.{CLR_RESET}")
        return

    # 2. Scrape Schemes
    log_section(f"2. SYNCING VRO ANALYTICS & PORTFOLIO BREAKDOWN ({total_schemes} Schemes)")

    stats = {
        "processed": 0,
        "updated": 0,
        "fresh": 0,
        "skipped": 0,
        "failed": 0,
    }
    lock = asyncio.Lock()
    queue = asyncio.Queue()
    for s in schemes_to_scrape:
        await queue.put(s)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        semaphore = asyncio.Semaphore(args.concurrency)
        tasks = [
            asyncio.create_task(vro_worker(queue, browser, semaphore, stats, total_schemes, lock, force=args.force))
            for _ in range(args.concurrency)
        ]
        await queue.join()
        for t in tasks:
            t.cancel()
        await browser.close()

    elapsed = time.time() - start_time

    # 3. Summary Report
    log_header("VALUE RESEARCH ONLINE (VRO) SYNC SUMMARY REPORT")
    print(f"  * Total Schemes Queried:    {CLR_BOLD}{total_schemes}{CLR_RESET} schemes")
    print(f"  * Successfully Scraped:     {CLR_GREEN}{stats['updated']} saved to DB{CLR_RESET}")
    print(f"  * Already Fresh (<24h):     {CLR_CYAN}{stats['fresh']} unchanged (use --force to re-sync){CLR_RESET}")
    print(f"  * Skipped (ULIP / Non-MF):  {CLR_YELLOW}{stats['skipped']} skipped{CLR_RESET}")
    print(f"  * Failed / Page Error:      {CLR_RED if stats['failed'] > 0 else CLR_RESET}{stats['failed']} failed{CLR_RESET}")
    print(f"  * Total Execution Time:     {CLR_BOLD}{elapsed:.2f} seconds{CLR_RESET}")
    print(f"  * Final Status:             {CLR_BOLD}{CLR_GREEN}COMPLETED SUCCESSFULLY{CLR_RESET}\n")

if __name__ == "__main__":
    asyncio.run(main())
