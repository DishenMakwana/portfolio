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
