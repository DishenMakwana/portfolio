export interface TransactionRow {
  id: number;
  date: string;
  schemeName: string;
  folioNo: string | null;
  memberName: string;
  type: string;
  transactionType: string | null;
  units: number;
  nav: number;
  amount: number;
  stampDuty: number | null;
  stt: number | null;
}

export type TransactionSortField =
  | "date"
  | "schemeName"
  | "memberName"
  | "type"
  | "transactionType"
  | "units"
  | "nav"
  | "amount"
  | "stampDuty"
  | "stt";

export const TRANSACTION_SORT_FIELDS: readonly TransactionSortField[] = [
  "date",
  "schemeName",
  "memberName",
  "type",
  "transactionType",
  "units",
  "nav",
  "amount",
  "stampDuty",
  "stt",
] as const;
