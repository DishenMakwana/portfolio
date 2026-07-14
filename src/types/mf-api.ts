export interface MfSearchResult {
  schemeCode: number;
  schemeName: string;
}

export interface NavDataPoint {
  date: string;
  nav: string;
}

export interface MfDetailsResponse {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
    isin_growth?: string | null;
    isin_div_reinvestment?: string | null;
  };
  data: NavDataPoint[];
  resolvedTicker?: string;
}
