#!/usr/bin/env python3
"""
Specialized Python Playwright Scraper for SIF (Specialized/Alternative Investment Funds) from Value Research Online (VRO).
SIF funds have a distinct UI layout containing:
1. Returns Table: Fund's Name, 1 Day, 1 Week, 15 Days, 1 Month, 3 Month, 6 Month, Since Launch
2. Asset Allocation: Equity %, Debt %, Others %, Cash %

Saves the extracted returns and asset allocation into PostgreSQL:
- portfolio.watchlist_fund_analytics (vro_returns_data, asset_allocation_data, vro_portfolio_data, last_vro_synced_at)
- portfolio.scheme_category_rankings (asset_allocation_data, updated_at)
- portfolio.schemes & portfolio.watchlist_schemes (vro_url)
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
    
    clean_url = db_url.split("?")[0]
    return psycopg2.connect(clean_url)

async def create_stealth_context(browser):
    ctx = await browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800}
    )
    await ctx.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """)
    return ctx

async def scrape_sif_page(page, url: str) -> dict:
    await page.route(
        "**/{gtm,analytics,taboola,criteo,doubleclick,adx,facebook,twitter,smartadserver,rubiconproject,casalemedia,amazon-adsystem,pubmatic,openx}**",
        lambda route: route.abort()
    )
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(3500)
    
    extracted = await page.evaluate(r'''() => {
        const result = {
            returns: null,
            assetAllocation: null,
            asOfDate: null
        };
        
        // Find as of date on page
        const bodyText = document.body.innerText;
        const asOfMatch = bodyText.match(/As on\s+([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})/i);
        if (asOfMatch) {
            result.asOfDate = asOfMatch[1];
        }

        // 1. Returns Table
        const tables = Array.from(document.querySelectorAll("table"));
        for (const t of tables) {
            const headers = Array.from(t.querySelectorAll("th")).map(th => th.innerText.trim());
            const hasHorizon = headers.some(h => /1\s*Day|1\s*Month|3\s*Month|Since\s*Launch/i.test(h));
            if (hasHorizon) {
                const rows = [];
                const trList = Array.from(t.querySelectorAll("tbody tr, tr")).filter(tr => tr.querySelector("td"));
                for (const tr of trList) {
                    const cells = Array.from(tr.querySelectorAll("td")).map(td => td.innerText.trim());
                    if (cells.length >= 2) {
                        const rowObj = { label: cells[0] };
                        for (let i = 1; i < cells.length && i < headers.length; i++) {
                            const key = headers[i];
                            const raw = cells[i].replace("%", "").trim();
                            const val = parseFloat(raw);
                            rowObj[key] = isNaN(val) ? cells[i] : `${val.toFixed(2)}%`;
                        }
                        rows.push(rowObj);
                    }
                }
                result.returns = {
                    asOfDate: result.asOfDate,
                    headers: headers.filter(h => !h.toLowerCase().includes("fund's name") && !h.toLowerCase().includes("fund name")),
                    rows: rows
                };
                break;
            }
        }
        
        // 2. Asset Allocation: Look for percentage blocks (e.g. 63.25% Equity, 8.25% Debt, 28.5% Others)
        const alloc = {};
        const rawBreakdown = {};
        
        const eqMatch = bodyText.match(/([0-9.]+)\s*%\s*\n*\s*Equity/i);
        const debtMatch = bodyText.match(/([0-9.]+)\s*%\s*\n*\s*Debt/i);
        const othersMatch = bodyText.match(/([0-9.]+)\s*%\s*\n*\s*Others/i);
        const cashMatch = bodyText.match(/([0-9.]+)\s*%\s*\n*\s*Cash/i);
        
        if (eqMatch) {
            const v = parseFloat(eqMatch[1]);
            alloc.equity = v;
            rawBreakdown["Equity"] = v;
        }
        if (debtMatch) {
            const v = parseFloat(debtMatch[1]);
            alloc.debt = v;
            rawBreakdown["Debt"] = v;
        }
        if (cashMatch) {
            const v = parseFloat(cashMatch[1]);
            alloc.cash = v;
            rawBreakdown["Cash"] = v;
        }
        if (othersMatch) {
            const v = parseFloat(othersMatch[1]);
            alloc.others = v;
            rawBreakdown["Others"] = v;
        }
        
        if (Object.keys(alloc).length > 0) {
            alloc.rawBreakdown = rawBreakdown;
            result.assetAllocation = alloc;
        }
        
        return result;
    }''')
    
    return extracted

def save_sif_data(scheme_code: str, scheme_name: str, category_name: str, vro_url: str, data: dict):
    conn = get_db_connection()
    cur = conn.cursor()
    now_iso = datetime.now().isoformat()
    
    returns_data = data.get("returns")
    asset_alloc = data.get("assetAllocation")
    
    returns_json = json.dumps(returns_data) if returns_data else None
    alloc_json = json.dumps(asset_alloc) if asset_alloc else None
    portfolio_json = json.dumps({
        "sectors": [],
        "topHoldings": [],
        "assetAllocation": asset_alloc,
        "asOfDate": data.get("asOfDate")
    }) if asset_alloc else None
    
    # 1. Upsert watchlist_fund_analytics
    cur.execute("""
        INSERT INTO portfolio.watchlist_fund_analytics (
            scheme_code,
            scheme_name,
            category_name,
            vro_url,
            vro_returns_data,
            asset_allocation_data,
            vro_portfolio_data,
            last_vro_synced_at,
            updated_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (scheme_code) DO UPDATE SET
            scheme_name = COALESCE(NULLIF(EXCLUDED.scheme_name, ''), portfolio.watchlist_fund_analytics.scheme_name),
            category_name = COALESCE(NULLIF(EXCLUDED.category_name, ''), portfolio.watchlist_fund_analytics.category_name),
            vro_url = COALESCE(EXCLUDED.vro_url, portfolio.watchlist_fund_analytics.vro_url),
            vro_returns_data = COALESCE(EXCLUDED.vro_returns_data, portfolio.watchlist_fund_analytics.vro_returns_data),
            asset_allocation_data = COALESCE(EXCLUDED.asset_allocation_data, portfolio.watchlist_fund_analytics.asset_allocation_data),
            vro_portfolio_data = COALESCE(EXCLUDED.vro_portfolio_data, portfolio.watchlist_fund_analytics.vro_portfolio_data),
            last_vro_synced_at = EXCLUDED.last_vro_synced_at,
            updated_at = NOW();
    """, (scheme_code, scheme_name, category_name, vro_url, returns_json, alloc_json, portfolio_json, now_iso))
    
    # 2. Upsert scheme_category_rankings asset_allocation_data
    if alloc_json:
        cur.execute("""
            INSERT INTO portfolio.scheme_category_rankings (
                scheme_code,
                scheme_name,
                category_name,
                asset_allocation_data,
                last_scraped_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (scheme_code) DO UPDATE SET
                asset_allocation_data = EXCLUDED.asset_allocation_data,
                last_scraped_at = EXCLUDED.last_scraped_at,
                updated_at = NOW();
        """, (scheme_code, scheme_name, category_name, alloc_json, now_iso))
        
    # 3. Update schemes (CAS) & watchlist_schemes
    cur.execute("""
        UPDATE portfolio.schemes
        SET vro_url = %s, updated_at = NOW()
        WHERE scheme_code_api = %s;
    """, (vro_url, scheme_code))
    
    cur.execute("""
        UPDATE portfolio.watchlist_schemes
        SET vro_url = %s, updated_at = NOW()
        WHERE scheme_code = %s;
    """, (vro_url, scheme_code))

    conn.commit()
    cur.close()
    conn.close()

async def sync_sif(scheme_code: str, scheme_name: str, category_name: str, vro_url: str, browser=None) -> dict:
    owns_browser = False
    if browser is None:
        p = await async_playwright().start()
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        owns_browser = True

    try:
        ctx = await create_stealth_context(browser)
        page = await ctx.new_page()
        print(f"Scraping SIF {scheme_code} from {vro_url}...", file=sys.stderr)
        data = await scrape_sif_page(page, vro_url)
        await page.close()
        await ctx.close()
        
        save_sif_data(scheme_code, scheme_name, category_name, vro_url, data)
        return data
    finally:
        if owns_browser:
            await browser.close()
            await p.stop()

async def main():
    parser = argparse.ArgumentParser(description="Scrape SIF Analytics from Value Research Online")
    parser.add_argument("--scheme-code", help="Scheme code (e.g. SIF-34)")
    parser.add_argument("--vro-url", help="Direct URL to Value Research SIF page")
    parser.add_argument("--sync-all", action="store_true", help="Sync all known SIF funds")
    args = parser.parse_args()

    sif_funds = [
        {
            "code": "SIF-34",
            "name": "ISIF Equity Ex-Top 100 Long-Short Fund (G)",
            "category": "Long-Short SIF",
            "url": "https://www.valueresearchonline.com/sif/isif-equity-ex-top-100-long-short-fund-regular-plan-5000067/"
        },
        {
            "code": "SIF-916",
            "name": "ISIF Hybrid Long-Short Fund (G)",
            "category": "Long-Short SIF",
            "url": "https://www.valueresearchonline.com/sif/isif-hybrid-long-short-fund-regular-plan-5000065/"
        },
        {
            "code": "SIF-96",
            "name": "Sapphire SIF Equity Long Short (G)",
            "category": "Long-Short SIF",
            "url": "https://www.valueresearchonline.com/sif/sapphire-equity-long-short-sif-regular-plan-5000134/"
        }
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )

        if args.sync_all or not args.scheme_code:
            for item in sif_funds:
                print(f"\n[SYNC] SIF {item['code']}: {item['name']}")
                res = await sync_sif(
                    scheme_code=item["code"],
                    scheme_name=item["name"],
                    category_name=item["category"],
                    vro_url=item["url"],
                    browser=browser
                )
                print(f"  [✓] Returns: {bool(res.get('returns'))} | Asset Allocation: {res.get('assetAllocation')}")
                await asyncio.sleep(2)
        else:
            matching = next((x for x in sif_funds if x["code"] == args.scheme_code), None)
            url = args.vro_url or (matching["url"] if matching else None)
            name = matching["name"] if matching else f"SIF {args.scheme_code}"
            cat = matching["category"] if matching else "Long-Short SIF"
            
            if not url:
                print(f"Error: No VRO URL for {args.scheme_code}", file=sys.stderr)
                sys.exit(1)
                
            res = await sync_sif(args.scheme_code, name, cat, url, browser=browser)
            print(json.dumps(res, indent=2))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
