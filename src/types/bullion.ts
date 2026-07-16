export interface BullionRates {
  asOfDate: string;
  gold: {
    "24K": number;
    "22K": number;
    "18K": number;
    change: number;
  };
  silver: {
    "999": number;
    "925": number;
    "800": number;
    change: number;
  };
  platinum: {
    PT950: number;
    PT900: number;
    PT850: number;
    change: number;
  };
}

export interface ChartDataPoint {
  date: string;
  Gold: number;
  Silver: number;
  Platinum: number;
}

export interface BullionCache {
  rates: BullionRates | null;
  chartData: ChartDataPoint[] | null;
  lastFetched: number;
}

export interface BullionClientProps {
  initialRates: BullionRates;
  initialChartData: ChartDataPoint[];
}

export interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
  }>;
  label?: string;
}

export const BULLION_METALS = {
  GOLD: "Gold",
  SILVER: "Silver",
  PLATINUM: "Platinum",
} as const;

export type BullionMetal = (typeof BULLION_METALS)[keyof typeof BULLION_METALS];

export const GOLD_PURITIES = {
  K24: "24K",
  K22: "22K",
  K18: "18K",
} as const;

export type GoldPurity = (typeof GOLD_PURITIES)[keyof typeof GOLD_PURITIES];

export const SILVER_PURITIES = {
  P999: "999",
  P925: "925",
  P800: "800",
} as const;

export type SilverPurity =
  (typeof SILVER_PURITIES)[keyof typeof SILVER_PURITIES];

export const PLATINUM_PURITIES = {
  PT950: "PT950",
  PT900: "PT900",
  PT850: "PT850",
} as const;

export type PlatinumPurity =
  (typeof PLATINUM_PURITIES)[keyof typeof PLATINUM_PURITIES];

export const GST_TYPES = {
  INCL: "Incl",
  EXCL: "Excl",
} as const;

export type GstType = (typeof GST_TYPES)[keyof typeof GST_TYPES];

export const TIMEFRAMES = {
  TF_7D: "7D",
  TF_30D: "30D",
  TF_1Y: "1Y",
} as const;

export type Timeframe = (typeof TIMEFRAMES)[keyof typeof TIMEFRAMES];
