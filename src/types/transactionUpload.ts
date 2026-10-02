export interface ParsedTransactionRow {
  date: string; // YYYY-MM-DD
  schemeName: string;
  folioNo: string;
  memberName: string;
  pan: string;
  transactionType: string; // raw type e.g. SIP, Purchase, Redemption
  type: "BUY" | "SELL";
  amount: number;
  units: number;
  nav: number;
  stampDuty: number | null;
  stt: number | null;
}

export interface TransactionUploadResult {
  success: boolean;
  message: string;
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  error?: string;
}

export interface TransactionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ParsedCoinOrderRow {
  clientId: string;
  isin: string;
  schemeName: string;
  plan: string | null;
  transactionMode: string;
  settlementId: string | null;
  tradeDate: string; // YYYY-MM-DD
  orderedAt: string | null;
  folioNumber: string | null;
  amount: number;
  units: number;
  nav: number;
  status: string; // "COMPLETE", "REJECTED", "CANCELLED", etc.
  exchangeOrderId: string | null;
  remarks: string | null;
  tag: string | null;
}

export interface CoinCsvParseResult {
  rows: ParsedCoinOrderRow[];
  totalRows: number;
  completeRows: number;
  skippedNonComplete: number;
  errors: string[];
}
