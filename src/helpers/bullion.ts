import type {
  BullionHistoryDbRecord,
  BullionRates,
  ChartDataPoint,
} from "@/types/bullion";

export const CITIES = [
  { id: "rajkot", name: "Rajkot", offset: 0.0 },
  { id: "mumbai", name: "Mumbai", offset: -0.0015 },
  { id: "delhi", name: "Delhi", offset: 0.001 },
  { id: "ahmedabad", name: "Ahmedabad", offset: -0.0005 },
  { id: "chennai", name: "Chennai", offset: 0.0025 },
  { id: "kolkata", name: "Kolkata", offset: 0.0015 },
  { id: "bangalore", name: "Bangalore", offset: 0.002 },
  { id: "hyderabad", name: "Hyderabad", offset: 0.0022 },
];

/**
 * Adjust base price by a city-specific offset percentage multiplier.
 */
export function getAdjustedBullionPrice(
  basePrice: number,
  offset: number
): number {
  return Math.round(basePrice * (1 + offset));
}

function formatBullionDate(timestamp: number, year: "numeric" | "2-digit") {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year,
  });
}

export function createBullionChartData(
  records: BullionHistoryDbRecord[]
): ChartDataPoint[] {
  return records.map((record) => ({
    date: formatBullionDate(record.timestamp, "2-digit"),
    timestamp: record.timestamp,
    Gold: Math.round(record.goldPrice),
    Silver: Math.round(record.silverPrice),
    Platinum: Math.round(record.platinumPrice),
  }));
}

export function createBullionRatesFromHistory(
  records: BullionHistoryDbRecord[]
): BullionRates {
  const latest = records[records.length - 1];
  const previous = records[records.length - 2] ?? latest;
  const gold24K = Math.round(latest.goldPrice);
  const silver999 = Math.round(latest.silverPrice);
  const platinumPT950 = Math.round(latest.platinumPrice);

  return {
    asOfDate: formatBullionDate(latest.timestamp, "numeric"),
    gold: {
      "24K": gold24K,
      "22K": Math.round((gold24K * 22) / 24),
      "18K": Math.round((gold24K * 18) / 24) + 2,
      change: Math.round(latest.goldPrice - previous.goldPrice),
    },
    silver: {
      "999": silver999,
      "925": Math.round(silver999 * 0.925),
      "800": Math.round(silver999 * 0.8),
      change: Number((latest.silverPrice - previous.silverPrice).toFixed(2)),
    },
    platinum: {
      PT950: platinumPT950,
      PT900: Math.round(platinumPT950 * 0.9474),
      PT850: Math.round(platinumPT950 * 0.8947),
      change: Number(
        (latest.platinumPrice - previous.platinumPrice).toFixed(2)
      ),
    },
  };
}
