import type {
  BullionHistoryDbRecord,
  BullionRates,
  ChartDataPoint,
  BullionAthData,
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

export function calculateBullionAthData(
  rates: BullionRates,
  chartData: ChartDataPoint[],
  cityOffset = 0
): BullionAthData {
  const currentTs =
    chartData.length > 0 && chartData[chartData.length - 1].timestamp
      ? chartData[chartData.length - 1].timestamp!
      : Date.now();

  let maxGold = {
    val: rates.gold["24K"],
    date: rates.asOfDate,
    ts: currentTs,
  };
  let maxSilver = {
    val: rates.silver["999"],
    date: rates.asOfDate,
    ts: currentTs,
  };
  let maxPlatinum = {
    val: rates.platinum["PT950"],
    date: rates.asOfDate,
    ts: currentTs,
  };

  for (const pt of chartData) {
    const ptTs = pt.timestamp || currentTs;
    if (pt.Gold > maxGold.val) {
      maxGold = { val: pt.Gold, date: pt.date, ts: ptTs };
    }
    if (pt.Silver > maxSilver.val) {
      maxSilver = { val: pt.Silver, date: pt.date, ts: ptTs };
    }
    if (pt.Platinum > maxPlatinum.val) {
      maxPlatinum = { val: pt.Platinum, date: pt.date, ts: ptTs };
    }
  }

  const calcDays = (athTs: number) => {
    return Math.max(0, Math.round((currentTs - athTs) / (1000 * 60 * 60 * 24)));
  };

  // 1. 24K Gold
  const curG24 = getAdjustedBullionPrice(rates.gold["24K"], cityOffset);
  const athG24 = getAdjustedBullionPrice(maxGold.val, cityOffset);
  const diffG24 = curG24 - athG24;
  const diffPctG24 = athG24 > 0 ? (diffG24 / athG24) * 100 : 0;

  // 2. 22K Gold
  const curG22 = getAdjustedBullionPrice(rates.gold["22K"], cityOffset);
  const athG22 = getAdjustedBullionPrice(
    Math.round((maxGold.val * 22) / 24),
    cityOffset
  );
  const diffG22 = curG22 - athG22;
  const diffPctG22 = athG22 > 0 ? (diffG22 / athG22) * 100 : 0;

  // 3. 999 Fine Silver
  const curS999 = getAdjustedBullionPrice(rates.silver["999"], cityOffset);
  const athS999 = getAdjustedBullionPrice(maxSilver.val, cityOffset);
  const diffS999 = curS999 - athS999;
  const diffPctS999 = athS999 > 0 ? (diffS999 / athS999) * 100 : 0;

  // 4. PT950 Platinum
  const curPT950 = getAdjustedBullionPrice(rates.platinum["PT950"], cityOffset);
  const athPT950 = getAdjustedBullionPrice(maxPlatinum.val, cityOffset);
  const diffPT950 = curPT950 - athPT950;
  const diffPctPT950 = athPT950 > 0 ? (diffPT950 / athPT950) * 100 : 0;

  return {
    gold24K: {
      title: "24K Gold",
      purity: "24K",
      unit: "/g",
      currentValue: curG24,
      currentDate: rates.asOfDate,
      athValue: athG24,
      athDate: maxGold.date,
      dayDiff: calcDays(maxGold.ts),
      diff: diffG24,
      diffPercent: diffPctG24,
      subtitle: "99.9% Pure Gold",
    },
    gold22K: {
      title: "22K Gold",
      purity: "22K",
      unit: "/g",
      currentValue: curG22,
      currentDate: rates.asOfDate,
      athValue: athG22,
      athDate: maxGold.date,
      dayDiff: calcDays(maxGold.ts),
      diff: diffG22,
      diffPercent: diffPctG22,
      subtitle: "Jewellery Grade Gold",
    },
    silver999: {
      title: "999 Fine Silver",
      purity: "999",
      unit: "/g",
      currentValue: curS999,
      currentDate: rates.asOfDate,
      athValue: athS999,
      athDate: maxSilver.date,
      dayDiff: calcDays(maxSilver.ts),
      diff: diffS999,
      diffPercent: diffPctS999,
      subtitle: "Pure Fine Silver",
    },
    platinumPT950: {
      title: "PT950 Platinum",
      purity: "PT950",
      unit: "/g",
      currentValue: curPT950,
      currentDate: rates.asOfDate,
      athValue: athPT950,
      athDate: maxPlatinum.date,
      dayDiff: calcDays(maxPlatinum.ts),
      diff: diffPT950,
      diffPercent: diffPctPT950,
      subtitle: "95% Pure Platinum",
    },
  };
}
