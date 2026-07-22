import type { SipMandateRow } from "@/types/portfolio";

export interface SipsClientProps {
  mandates: SipMandateRow[];
}

export interface ParsedSipMandate {
  investorName: string;
  schemeName: string;
  folioNo: string;
  monthlyAmount: number;
  monthlyHistory: Record<string, number>;
  startMonth: string;
  isActive: boolean;
}

export interface SaveSipMandatesResult {
  inserted: number;
  skipped: number;
}
