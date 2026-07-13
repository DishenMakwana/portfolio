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
