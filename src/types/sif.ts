export type SifAssetClass = "Equity" | "Debt" | "Hybrid";

export interface SifTaxationDetails {
  taxCategory: "Equity" | "Debt" | "Hybrid";
  stcg: string;
  ltcg: string;
  holdingPeriodLtcg?: string;
  note?: string;
}

export interface SifSchemeComparison {
  id: number;
  srNo: number;
  assetClass: SifAssetClass;
  schemeName: string;
  traditionalScheme: string;
  minimumRequirements: string;
  derivativesLimit: string;
  derivativesPct: number;
  redemptionFrequency: string;
  redemptionNote?: string;
  riskLevel: "High" | "Very High" | "Moderate";
  targetReturn: string;
  returnMin: number;
  returnMax: number;
  taxation: SifTaxationDetails;
  alternativeTaxation?: SifTaxationDetails;
  description: string;
  mechanism: string;
  keyAdvantages: string[];
  downsideProtectionMechanics: string;
  idealInvestorProfile: string;
}

export interface SifVsTraditionalPillar {
  pillar: string;
  traditionalMf: string;
  sifStrategy: string;
  advantage: string;
}
