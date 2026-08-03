import { calculateXIRR } from "@/lib/xirr";
import type {
  FinancialYearAssetClass,
  FinancialYearSnapshot,
  FinancialYearSnapshotRow,
  FinancialYearTransaction,
} from "@/types/insights";

export type FinancialYearBalances = Record<FinancialYearAssetClass, number>;

const ASSET_CLASSES: FinancialYearAssetClass[] = [
  "equity",
  "hybrid",
  "debtOthers",
];

export function getFinancialYearStart(reportDate: string): string {
  const [yearText, monthText] = reportDate.split("-");
  const year = Number(yearText) - (Number(monthText) < 4 ? 1 : 0);
  return `${year}-04-01`;
}

export function getFinancialYearLabel(reportDate: string): string {
  const startYear = Number(getFinancialYearStart(reportDate).slice(0, 4));
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function getMonthStartFromLabel(monthLabel: string): string | null {
  const [monthText, yearText] = monthLabel.trim().toUpperCase().split(/\s+/);
  const monthNumber = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ].indexOf(monthText);
  const year = Number(yearText);
  if (monthNumber < 0 || !Number.isInteger(year)) return null;
  return `${year < 100 ? 2000 + year : year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
}

export function getFinancialYearAssetClass(
  category: string | null | undefined,
  schemeName?: string | null
): FinancialYearAssetClass {
  const cleanCategory = (category || "").toLowerCase();
  const combinedName = `${cleanCategory} ${(schemeName || "").toLowerCase()}`;
  if (
    combinedName.includes("hybrid") ||
    combinedName.includes("balanced") ||
    combinedName.includes("multi asset") ||
    combinedName.includes("equity savings") ||
    combinedName.includes("arbitrage")
  ) {
    return "hybrid";
  }
  if (
    combinedName.includes("equity") ||
    combinedName.includes("flexi") ||
    combinedName.includes("focused") ||
    combinedName.includes("large cap") ||
    combinedName.includes("large & mid") ||
    combinedName.includes("large and mid") ||
    combinedName.includes("mid cap") ||
    combinedName.includes("small cap") ||
    combinedName.includes("multi cap") ||
    combinedName.includes("thematic") ||
    combinedName.includes("value") ||
    combinedName.includes("contra") ||
    combinedName.includes("sector") ||
    combinedName.includes("index") ||
    combinedName.includes("elss")
  ) {
    return "equity";
  }
  return "debtOthers";
}

export function isIncludedInMutualFundSnapshot(
  category: string | null | undefined,
  schemeName?: string | null
): boolean {
  const combinedName = `${category || ""} ${schemeName || ""}`.toLowerCase();
  return !combinedName.includes("ulip") && !combinedName.includes("insurance");
}

export function findNavAtOrBefore(
  history: Array<{ date: string; nav: number }>,
  targetDate: string
): number | null {
  const targetTime = new Date(targetDate).getTime();
  const eligible = history
    .map((point) => {
      const [day, month, year] = point.date.split("-");
      return {
        time: new Date(`${year}-${month}-${day}`).getTime(),
        nav: point.nav,
      };
    })
    .filter((point) => point.time <= targetTime && Number.isFinite(point.nav))
    .sort((a, b) => b.time - a.time);
  return eligible[0]?.nav ?? null;
}

export function createEmptyFinancialYearBalances(): FinancialYearBalances {
  return { equity: 0, hybrid: 0, debtOthers: 0 };
}

export function calculateFinancialYearSnapshot(
  reportDate: string,
  openingBalances: FinancialYearBalances,
  closingBalances: FinancialYearBalances,
  transactions: FinancialYearTransaction[]
): FinancialYearSnapshot {
  const startDate = getFinancialYearStart(reportDate);
  const fyLabel = getFinancialYearLabel(reportDate);
  const purchases = createEmptyFinancialYearBalances();
  const redemptions = createEmptyFinancialYearBalances();

  for (const transaction of transactions) {
    if (
      !isIncludedInMutualFundSnapshot(
        transaction.category,
        transaction.schemeName
      )
    ) {
      continue;
    }
    const assetClass = getFinancialYearAssetClass(
      transaction.category,
      transaction.schemeName
    );
    if (transaction.type === "BUY") {
      purchases[assetClass] += transaction.amount;
    } else {
      redemptions[assetClass] += transaction.amount;
    }
  }

  const switchIns = createEmptyFinancialYearBalances();
  const switchOuts = createEmptyFinancialYearBalances();
  const dividendPayouts = createEmptyFinancialYearBalances();
  const netAdditions = createEmptyFinancialYearBalances();
  const netGains = createEmptyFinancialYearBalances();

  for (const assetClass of ASSET_CLASSES) {
    netAdditions[assetClass] =
      purchases[assetClass] +
      switchIns[assetClass] -
      switchOuts[assetClass] -
      redemptions[assetClass];
    netGains[assetClass] =
      closingBalances[assetClass] -
      openingBalances[assetClass] -
      netAdditions[assetClass];
  }

  const absReturns = createEmptyFinancialYearBalances();
  for (const assetClass of ASSET_CLASSES) {
    const capital = openingBalances[assetClass] + purchases[assetClass];
    absReturns[assetClass] =
      capital > 0 ? (netGains[assetClass] / capital) * 100 : 0;
  }
  const totalCapital =
    openingBalances.equity +
    openingBalances.hybrid +
    openingBalances.debtOthers +
    purchases.equity +
    purchases.hybrid +
    purchases.debtOthers;
  const totalNetGains = netGains.equity + netGains.hybrid + netGains.debtOthers;
  const totalAbsReturn =
    totalCapital > 0 ? (totalNetGains / totalCapital) * 100 : 0;

  const rows: FinancialYearSnapshotRow[] = [
    makeBalanceRow("Opening Balance", openingBalances),
    makeBalanceRow("Purchase", purchases),
    makeBalanceRow("Switch In", switchIns),
    makeBalanceRow("Switch Out", switchOuts),
    makeBalanceRow("Div. Payout", dividendPayouts),
    makeBalanceRow("Redemption", redemptions),
    makeBalanceRow("Net Addition", netAdditions),
    makeBalanceRow("Closing Balance", closingBalances),
    makeBalanceRow("Net Gain", netGains),
    makeReturnRow("Abs Return (%)", absReturns, totalAbsReturn),
    makeReturnRow(
      "XIRR (%)",
      calculateClassXirr(
        startDate,
        reportDate,
        openingBalances,
        closingBalances,
        transactions
      )
    ),
  ];

  return { label: fyLabel, startDate, endDate: reportDate, rows };
}

function makeBalanceRow(
  label: string,
  balances: FinancialYearBalances
): FinancialYearSnapshotRow {
  return {
    label,
    equity: balances.equity,
    hybrid: balances.hybrid,
    debtOthers: balances.debtOthers,
    total: balances.equity + balances.hybrid + balances.debtOthers,
  };
}

function makeReturnRow(
  label: string,
  returns: FinancialYearBalances,
  totalValue?: number
): FinancialYearSnapshotRow {
  const tot = totalValue !== undefined ? totalValue : returns.debtOthers;
  return {
    label,
    equity: returns.equity,
    hybrid: returns.hybrid,
    debtOthers: returns.debtOthers,
    total: tot,
    equityXirr: returns.equity,
    hybridXirr: returns.hybrid,
    debtOthersXirr: returns.debtOthers,
    totalXirr: tot,
  };
}

function calculateClassXirr(
  startDate: string,
  endDate: string,
  openingBalances: FinancialYearBalances,
  closingBalances: FinancialYearBalances,
  transactions: FinancialYearTransaction[]
): FinancialYearBalances {
  const returns = createEmptyFinancialYearBalances();
  const totalOpening = Object.values(openingBalances).reduce(
    (sum, value) => sum + value,
    0
  );
  const totalClosing = Object.values(closingBalances).reduce(
    (sum, value) => sum + value,
    0
  );

  for (const assetClass of ASSET_CLASSES) {
    const cashFlows = [];
    if (openingBalances[assetClass] > 0) {
      cashFlows.push({
        amount: -openingBalances[assetClass],
        date: new Date(startDate),
      });
    }
    for (const transaction of transactions) {
      if (
        getFinancialYearAssetClass(
          transaction.category,
          transaction.schemeName
        ) !== assetClass
      )
        continue;
      cashFlows.push({
        amount:
          transaction.type === "BUY" ? -transaction.amount : transaction.amount,
        date: new Date(transaction.date),
      });
    }
    if (closingBalances[assetClass] > 0) {
      cashFlows.push({
        amount: closingBalances[assetClass],
        date: new Date(endDate),
      });
    }
    returns[assetClass] = calculateXIRR(cashFlows);
  }

  const totalCashFlows = [];
  if (totalOpening > 0)
    totalCashFlows.push({ amount: -totalOpening, date: new Date(startDate) });
  for (const transaction of transactions) {
    totalCashFlows.push({
      amount:
        transaction.type === "BUY" ? -transaction.amount : transaction.amount,
      date: new Date(transaction.date),
    });
  }
  if (totalClosing > 0)
    totalCashFlows.push({ amount: totalClosing, date: new Date(endDate) });
  returns.debtOthers = calculateXIRR(totalCashFlows);

  return returns;
}

export function calculateCagr(
  startValuation: number,
  endValuation: number,
  startDateStr: string,
  endDateStr: string
): number {
  if (startValuation <= 0 || endValuation <= 0) return 0;
  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime();
  const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0) return 0;
  const cagr = (Math.pow(endValuation / startValuation, 1 / years) - 1) * 100;
  return isNaN(cagr) || !isFinite(cagr) ? 0 : cagr;
}

export function getAvailableFinancialYears(
  txDates: string[],
  reportDate: string
): Array<{
  label: string;
  startYear: number;
  startDate: string;
  endDate: string;
}> {
  const yearsSet = new Set<number>();

  for (const dStr of txDates) {
    if (!dStr) continue;
    const [yText, mText] = dStr.split("-");
    const yearNum = Number(yText);
    const monthNum = Number(mText);
    if (!isNaN(yearNum) && !isNaN(monthNum)) {
      const fyStartYear = monthNum < 4 ? yearNum - 1 : yearNum;
      yearsSet.add(fyStartYear);
    }
  }

  const [repY, repM] = reportDate.split("-");
  const repYear = Number(repY);
  const repMonth = Number(repM);
  if (!isNaN(repYear) && !isNaN(repMonth)) {
    const repFyStartYear = repMonth < 4 ? repYear - 1 : repYear;
    yearsSet.add(repFyStartYear);
  }

  const sortedFyStartYears = Array.from(yearsSet).sort((a, b) => b - a);

  return sortedFyStartYears.map((startYear) => {
    const label = `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
    const startDate = `${startYear}-04-01`;
    const fyEndDefault = `${startYear + 1}-03-31`;
    const endDate = reportDate < fyEndDefault ? reportDate : fyEndDefault;
    return {
      label,
      startYear,
      startDate,
      endDate,
    };
  });
}
