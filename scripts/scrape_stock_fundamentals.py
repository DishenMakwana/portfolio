import sys
import json
import urllib.request
import re
from playwright.sync_api import sync_playwright

def get_groww_stock_slug(symbol):
    clean_sym = symbol.replace('.NS', '').replace('.BO', '').replace('.BSE', '').replace('.NSE', '').strip().upper()
    
    # Try searching on Groww entity API
    search_url = f"https://groww.in/v1/api/search/v1/entity?app=false&entity_type=stocks&page=0&q={clean_sym}&size=5"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
    
    try:
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('content', [])
            for r in results:
                nse_code = r.get('nse_scrip_code') or ''
                bse_code = r.get('bse_scrip_code') or ''
                sid = r.get('id')
                if clean_sym.lower() in [nse_code.lower(), bse_code.lower(), sid.lower()]:
                    return sid
            if results and results[0].get('id'):
                return results[0]['id']
    except Exception as e:
        sys.stderr.write(f"Search API error: {e}\n")
        
    return clean_sym.lower()

def calculate_growth_from_statements(financial_statement):
    growth = {
        "revenueGrowth1Y": "--",
        "revenueGrowth3Y": "--",
        "profitGrowth1Y": "--",
        "profitGrowth3Y": "--"
    }
    if not financial_statement:
        return growth
        
    statements = financial_statement.get('CONSOLIDATED') or financial_statement.get('STANDALONE') or []
    for item in statements:
        title = (item.get('title') or '').lower()
        yearly = item.get('yearly') or {}
        quarterly = item.get('quarterly') or {}
        years = sorted([int(y) for y in yearly.keys() if str(y).isdigit()])
        
        # 1Y YoY Growth
        yoy_1y = None
        if len(years) >= 2:
            latest_val = yearly.get(str(years[-1]))
            prev_val = yearly.get(str(years[-2]))
            if latest_val is not None and prev_val is not None and prev_val != 0:
                yoy_1y = ((latest_val - prev_val) / abs(prev_val)) * 100
        elif len(quarterly) >= 5:
            q_keys = list(quarterly.keys())
            latest_q = quarterly[q_keys[-1]]
            prev_q_yr = quarterly[q_keys[-5]]
            if latest_q is not None and prev_q_yr is not None and prev_q_yr != 0:
                yoy_1y = ((latest_q - prev_q_yr) / abs(prev_q_yr)) * 100

        # 3Y CAGR
        cagr_3y = None
        if len(years) >= 4:
            latest_val = yearly.get(str(years[-1]))
            base_val = yearly.get(str(years[-4]))
            if latest_val is not None and base_val is not None and base_val > 0 and latest_val > 0:
                cagr_3y = ((latest_val / base_val) ** (1/3) - 1) * 100

        if 'revenue' in title:
            if yoy_1y is not None:
                growth['revenueGrowth1Y'] = f"{yoy_1y:+.1f}%"
            if cagr_3y is not None:
                growth['revenueGrowth3Y'] = f"{cagr_3y:+.1f}%"
        elif 'profit' in title or 'net income' in title:
            if yoy_1y is not None:
                growth['profitGrowth1Y'] = f"{yoy_1y:+.1f}%"
            if cagr_3y is not None:
                growth['profitGrowth3Y'] = f"{cagr_3y:+.1f}%"

    return growth

def scrape_stock_data(symbol):
    slug = get_groww_stock_slug(symbol)
    url = f"https://groww.in/stocks/{slug}"
    sys.stderr.write(f"Scraping Groww stock URL: {url}\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        )
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(2000)
        
        extracted = page.evaluate('''() => {
            const nextScript = document.getElementById('__NEXT_DATA__');
            if (!nextScript) return null;
            try {
                const data = JSON.parse(nextScript.innerText);
                const props = data.props?.pageProps;
                return {
                    header: props?.stockData?.header,
                    fundamentals: props?.stockData?.fundamentals,
                    details: props?.stockData?.details,
                    priceData: props?.stockData?.priceData,
                    financialStatementV2: props?.stockData?.financialStatementV2,
                    financialStatement: props?.stockData?.financialStatement,
                    shareHoldingPattern: props?.stockData?.shareHoldingPattern,
                };
            } catch(e) {
                return null;
            }
        }''')
        
        browser.close()
        
        if not extracted:
            sys.stderr.write("Failed to extract __NEXT_DATA__ from Groww\n")
            return None
            
        header = extracted.get('header') or {}
        details = extracted.get('details') or {}
        fundamentals_list = extracted.get('fundamentals') or []
        price_data = extracted.get('priceData') or {}
        stmt_v2 = extracted.get('financialStatementV2') or extracted.get('financialStatement') or {}
        shareholding_raw = extracted.get('shareHoldingPattern') or {}
        
        # Map fundamentals list into key-value map
        f_map = {}
        for f in fundamentals_list:
            name = (f.get('name') or '').strip().lower()
            val = (f.get('value') or '').strip()
            f_map[name] = val
            
        def parse_num(val_str):
            if not val_str or val_str == '--':
                return None
            cleaned = re.sub(r'[^\d.-]', '', val_str)
            try:
                return float(cleaned)
            except ValueError:
                return None
                
        # Parse 10 Fundamentals
        market_cap_str = f_map.get('market cap') or f_map.get('mkt cap') or None
        pe_ratio = parse_num(f_map.get('p/e ratio(ttm)') or f_map.get('p/e ratio') or f_map.get('pe'))
        pb_ratio = parse_num(f_map.get('p/b ratio') or f_map.get('pb ratio') or f_map.get('pb'))
        industry_pe = parse_num(f_map.get('industry p/e') or f_map.get('industry pe'))
        debt_to_equity = parse_num(f_map.get('debt to equity'))
        roe = parse_num(f_map.get('roe'))
        eps = parse_num(f_map.get('eps(ttm)') or f_map.get('eps'))
        div_yield = parse_num(f_map.get('dividend yield') or f_map.get('div yield'))
        book_value = parse_num(f_map.get('book value'))
        face_value = parse_num(f_map.get('face value'))
        
        # Financial Growth
        growth = calculate_growth_from_statements(stmt_v2)
        
        # Price Range
        nse_p = price_data.get('nse') or price_data.get('bse') or {}
        year_high = nse_p.get('yearHighPrice')
        year_low = nse_p.get('yearLowPrice')
        
        # Shareholding Pattern
        latest_sh = None
        if shareholding_raw:
            latest_quarter = list(shareholding_raw.keys())[0] if shareholding_raw else None
            if latest_quarter:
                q_data = shareholding_raw[latest_quarter]
                promoter_pct = q_data.get('promoters', {}).get('individual', {}).get('percent', 0) or q_data.get('promoters', {}).get('percent', 0)
                fii_pct = q_data.get('foreignInstitutions', {}).get('percent', 0)
                mf_pct = q_data.get('mutualFunds', {}).get('percent', 0)
                other_dii = q_data.get('otherDomesticInstitutions', {}).get('insurance', {}).get('percent', 0)
                dii_pct = mf_pct + other_dii
                retail_pct = q_data.get('retailAndOthers', {}).get('percent', 0)
                
                latest_sh = {
                    "quarter": latest_quarter,
                    "promoters": round(promoter_pct, 2),
                    "fii": round(fii_pct, 2),
                    "dii": round(dii_pct, 2),
                    "retail": round(retail_pct, 2),
                }

        result = {
            "symbol": symbol,
            "searchId": slug,
            "displayName": header.get('displayName') or header.get('shortName') or symbol,
            "industryName": header.get('industryName') or "General",
            "logoUrl": header.get('logoUrl'),
            "foundedYear": details.get('foundedYear'),
            "managingDirector": details.get('managingDirector') or details.get('ceo'),
            "businessSummary": details.get('businessSummary'),
            "marketCap": market_cap_str,
            "peRatio": pe_ratio,
            "pbRatio": pb_ratio,
            "industryPe": industry_pe,
            "debtToEquity": debt_to_equity,
            "roe": roe,
            "eps": eps,
            "dividendYield": div_yield,
            "bookValue": book_value,
            "faceValue": face_value,
            "revenueGrowth1Y": growth['revenueGrowth1Y'],
            "revenueGrowth3Y": growth['revenueGrowth3Y'],
            "profitGrowth1Y": growth['profitGrowth1Y'],
            "profitGrowth3Y": growth['profitGrowth3Y'],
            "yearHigh": year_high,
            "yearLow": year_low,
            "shareholding": latest_sh,
            "shareholdingData": json.dumps(latest_sh) if latest_sh else None,
        }
        return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python3 scrape_stock_fundamentals.py <SYMBOL>\n")
        sys.exit(1)
        
    sym = sys.argv[1]
    res = scrape_stock_data(sym)
    if res:
        print(json.dumps(res, indent=2))
        sys.exit(0)
    else:
        sys.exit(1)
