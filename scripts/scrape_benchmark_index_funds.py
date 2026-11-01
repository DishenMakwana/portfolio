#!/usr/bin/env python3
"""
Scrapes benchmark index mutual funds (Nifty 50, Nifty 100, Nifty Midcap 150, Nifty Smallcap 250)
and persists them into portfolio.scheme_category_rankings for pure passive index valuation calculations.
"""

import sys
import os
import asyncio

# Add scripts directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scrape_fund_rankings import scrape_scheme, save_ranking_to_db
from playwright.async_api import async_playwright

BENCHMARK_INDEX_FUNDS = [
    # Large Cap (Nifty 50 & Nifty 100)
    {
        "schemeCode": "INDEX_NIFTY50_MO",
        "schemeName": "Motilal Oswal Nifty 50 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "motilal-oswal-nifty-50-index-fund-direct-growth",
    },
    {
        "schemeCode": "INDEX_NIFTY100_BANDHAN",
        "schemeName": "Bandhan Nifty 100 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "bandhan-nifty-100-index-fund-direct-growth",
    },
    {
        "schemeCode": "INDEX_NIFTY100_AXIS",
        "schemeName": "Axis Nifty 100 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "axis-nifty-100-index-fund-direct-growth",
    },
    # Mid Cap (Nifty Midcap 150)
    {
        "schemeCode": "INDEX_MIDCAP150_MO",
        "schemeName": "Motilal Oswal Nifty Midcap 150 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "motilal-oswal-nifty-midcap-150-index-fund-direct-growth",
    },
    {
        "schemeCode": "INDEX_MIDCAP150_NIPPON",
        "schemeName": "Nippon India Nifty Midcap 150 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "nippon-india-nifty-midcap-150-index-fund-direct-growth",
    },
    # Small Cap (Nifty Smallcap 250)
    {
        "schemeCode": "INDEX_SMALLCAP250_MO",
        "schemeName": "Motilal Oswal Nifty Smallcap 250 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "motilal-oswal-nifty-smallcap-250-index-fund-direct-growth",
    },
    {
        "schemeCode": "INDEX_SMALLCAP250_NIPPON",
        "schemeName": "Nippon India Nifty Smallcap 250 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "nippon-india-nifty-smallcap-250-index-fund-direct-growth",
    },
    {
        "schemeCode": "INDEX_SMALLCAP250_SBI",
        "schemeName": "SBI Nifty Smallcap 250 Index Fund - Direct Plan - Growth",
        "categoryName": "Index Funds",
        "slug": "sbi-nifty-smallcap-250-index-fund-direct-growth",
    },
]

async def main():
    print(f"Starting scrape for {len(BENCHMARK_INDEX_FUNDS)} benchmark index funds...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for item in BENCHMARK_INDEX_FUNDS:
            print(f"Scraping {item['schemeName']} ({item['slug']})...")
            result = await scrape_scheme(
                browser,
                item["schemeCode"],
                item["schemeName"],
                item["categoryName"],
                item["slug"],
            )
            if result and result.get("status") == "SUCCESS":
                adv = result.get("advancedRatios", {})
                print(f"  [SUCCESS] PE: {adv.get('peRatio')}, PB: {adv.get('pbRatio')}")
                save_ranking_to_db(result)
            else:
                print(f"  [FAILED] {result}")
        await browser.close()
    print("Finished syncing benchmark index funds!")

if __name__ == "__main__":
    asyncio.run(main())
