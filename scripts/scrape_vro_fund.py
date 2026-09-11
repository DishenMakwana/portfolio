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
import psycopg2
from playwright.async_api import async_playwright

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
    conn.close()
    if row:
        return {
            "schemeCode": row[0],
            "schemeName": row[1],
            "category": row[2],
            "vroUrl": row[3],
        }
    return None

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
    
    # 2. Upsert into watchlist_fund_analytics
    cur.execute("""
        INSERT INTO portfolio.watchlist_fund_analytics (
            scheme_code,
            scheme_name,
            category_name,
            vro_risk_data,
            vro_returns_data,
            vro_portfolio_data,
            last_vro_synced_at,
            updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (scheme_code) DO UPDATE SET
            vro_risk_data = EXCLUDED.vro_risk_data,
            vro_returns_data = EXCLUDED.vro_returns_data,
            vro_portfolio_data = EXCLUDED.vro_portfolio_data,
            last_vro_synced_at = EXCLUDED.last_vro_synced_at,
            updated_at = NOW();
    """, (
        scheme_code,
        scheme_name,
        category_name,
        json.dumps(risk_data) if risk_data else None,
        json.dumps(returns_data) if returns_data else None,
        json.dumps(portfolio_data) if portfolio_data else None,
        now_iso
    ))
    
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
        await page.wait_for_timeout(3500)

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
        "**/{gtm,analytics,taboola,criteo,doubleclick,adx,facebook,twitter,smartadserver,rubiconproject,casalemedia}**",
        lambda route: route.abort()
    )
    try:
        await page.goto(clean_base + "#fund-portfolio", wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(3500)

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
        top_holdings = []

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
                                "sector": r[0],
                                "fundPct": f_pct,
                                "categoryPct": c_pct
                            })
                        except ValueError:
                            pass
            
            # Top Holdings table: Company Name | Sector | P/E Ratio | % Assets
            if "Company" in header_str and ("P/E" in header_str or "Assets" in header_str or "%" in header_str or "Portfolio" in header_str):
                for r in t[1:]:
                    if len(r) >= 2 and r[0] != "Company Name" and r[0] != "Company":
                        try:
                            if len(r) >= 4:
                                pe_str = r[2].replace(",", "").strip()
                                pe_val = float(pe_str) if pe_str and pe_str != "--" and pe_str != "-" else None
                                asset_pct = float(r[3].replace("%", "").strip())
                                sector_name = r[1]
                            else:
                                pe_val = None
                                asset_pct = float(r[1].replace("%", "").strip())
                                sector_name = None
                            top_holdings.append({
                                "companyName": r[0],
                                "sector": sector_name,
                                "peRatio": pe_val,
                                "assetPct": asset_pct
                            })
                        except (ValueError, IndexError):
                            pass

        await page.close()
        return {
            "sectors": sectors,
            "topHoldings": top_holdings,
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
        "asOfDate": None
    }

async def scrape_vro_fund(vro_url: str):
    clean_base = vro_url.split("#")[0].rstrip("/") + "/"
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # Scrape Risk, Performance, and Portfolio tabs concurrently
        risk_res, perf_res, port_res = await asyncio.gather(
            scrape_risk(context, clean_base),
            scrape_performance(context, clean_base),
            scrape_portfolio(context, clean_base)
        )

        await browser.close()

    return {
        "risk": risk_res,
        "returns": perf_res,
        "portfolio": port_res
    }

async def main():
    parser = argparse.ArgumentParser(description="Scrape Mutual Fund Analytics from Value Research Online")
    parser.add_argument("--scheme-code", required=True, help="AMFI scheme code (e.g. 151751)")
    parser.add_argument("--vro-url", help="Direct URL to Value Research fund page")
    args = parser.parse_args()

    clean_code = args.scheme_code.replace("w_", "").replace("sold_", "").strip()
    scheme_meta = get_watchlist_scheme_meta(clean_code)
    
    vro_url = args.vro_url or (scheme_meta.get("vroUrl") if scheme_meta else None)
    
    if not vro_url:
        print(json.dumps({
            "success": False,
            "error": f"No Value Research Online URL provided or configured for scheme {clean_code}."
        }))
        sys.exit(1)

    scheme_name = scheme_meta["schemeName"] if scheme_meta else f"Scheme {clean_code}"
    category_name = scheme_meta.get("category") if scheme_meta else ""

    print(f"Scraping Value Research Online for {clean_code} from {vro_url}...", file=sys.stderr)
    result = await scrape_vro_fund(vro_url)

    if not result["risk"] and not result["returns"] and not result["portfolio"]["topHoldings"]:
        print(json.dumps({
            "success": False,
            "error": "Failed to extract data from Value Research Online page."
        }))
        sys.exit(1)

    # Save to PostgreSQL
    save_vro_analytics(
        scheme_code=clean_code,
        scheme_name=scheme_name,
        category_name=category_name,
        vro_url=vro_url,
        risk_data=result["risk"],
        returns_data=result["returns"],
        portfolio_data=result["portfolio"]
    )

    output = {
        "success": True,
        "schemeCode": clean_code,
        "vroUrl": vro_url,
        "vroRisk": result["risk"],
        "vroReturns": result["returns"],
        "vroPortfolio": result["portfolio"]
    }
    print(json.dumps(output))

if __name__ == "__main__":
    asyncio.run(main())
