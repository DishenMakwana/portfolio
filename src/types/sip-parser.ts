export interface SipRow {
  srNo: number;
  investorName: string;
  schemeName: string;
  folioNo: string;
  monthlyAmount: number;
  monthlyHistory: Record<string, number>;
  startMonth: string;
  isActive: boolean;
}

export interface SipParsed {
  asOfDate: string;
  sourceFile: string;
  sips: SipRow[];
}
