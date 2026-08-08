import { db } from "@/db/db";
import {
  reports,
  familyMembers,
  schemes,
  holdingsSnapshot,
  sipMandates,
  sipTransactions,
  memberReportCagrs,
  zerodhaHoldings,
  zerodhaSchemes,
  msflHoldings,
  msflSchemes,
  transactions,
  schemeNavHistory,
} from "@/db/schema";
import { eq, desc, lte, lt, inArray } from "drizzle-orm";
import {
  getBenchmarkHistory,
  calculateAlpha,
  isBuyTransactionType,
  isSellTransactionType,
} from "@/lib/alpha";
import { calculateXIRR } from "@/lib/xirr";
import {
  calculateFinancialYearSnapshot,
  createEmptyFinancialYearBalances,
  getFinancialYearAssetClass,
  findNavAtOrBefore,
  getMonthStartFromLabel,
  isIncludedInMutualFundSnapshot,
  getFinancialYearStart,
  getAvailableFinancialYears,
} from "@/helpers/financial-year";
import type {
  BenchmarkReturns,
  FinancialYearTransaction,
  InsightsData,
  SoldHoldingItem,
  FyTrackerData,
  FyMultiYearComparisonRow,
} from "@/types/insights";

// ─── Benchmark helper ──────────────────────────────────────────────────────────
async function getBenchmarkReturns(
  reportDate: string
): Promise<BenchmarkReturns> {
  const benchmarkCode = "120716";
  const benchmarkName = "UTI Nifty 50 Index Fund Direct Growth";
  const history = await getBenchmarkHistory(benchmarkCode);
  const rows =
    history?.data
      .map((point) => ({
        date: point.date,
        nav: Number(point.nav),
      }))
      .filter((point) => Number.isFinite(point.nav) && point.nav > 0) ?? [];

  if (rows.length === 0) {
    return {
      benchmarkCode,
      benchmarkName,
      endDate: "N/A",
      endNav: 0,
      return1Y: null,
      cagr3Y: null,
      cagr5Y: null,
      earliestDate: null,
    };
  }

  function parseNavDate(s: string): Date {
    const [dd, mm, yyyy] = s.split("-");
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  function parseReportDate(s: string): Date {
    const [yyyy, mm, dd] = s.split("-");
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  const sorted = [...rows].sort(
    (a, b) => parseNavDate(a.date).getTime() - parseNavDate(b.date).getTime()
  );

  const reportEndDate = parseReportDate(reportDate);
  const end =
    [...sorted]
      .reverse()
      .find((point) => parseNavDate(point.date) <= reportEndDate) ??
    sorted[sorted.length - 1];
  const endDate = parseNavDate(end.date);

  function navAtYearsAgo(years: number): { nav: number; date: string } | null {
    const cutoff = new Date(endDate);
    cutoff.setFullYear(cutoff.getFullYear() - years);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (parseNavDate(sorted[i].date) <= cutoff) return sorted[i];
    }
    return null;
  }

  function cagrPct(oldNav: number, newNav: number, years: number): number {
    return (Math.pow(newNav / oldNav, 1 / years) - 1) * 100;
  }

  const y1 = navAtYearsAgo(1);
  const y3 = navAtYearsAgo(3);
  const y5 = navAtYearsAgo(5);

  const return1Y = y1 ? ((end.nav - y1.nav) / y1.nav) * 100 : null;
  const cagr3Y = y3 ? cagrPct(y3.nav, end.nav, 3) : null;
  const cagr5Y = y5 ? cagrPct(y5.nav, end.nav, 5) : null;

  return {
    benchmarkCode,
    benchmarkName: history?.meta?.scheme_name || benchmarkName,
    endDate: end.date,
    endNav: end.nav,
    return1Y: return1Y !== null ? Math.round(return1Y * 100) / 100 : null,
    cagr3Y: cagr3Y !== null ? Math.round(cagr3Y * 100) / 100 : null,
    cagr5Y: cagr5Y !== null ? Math.round(cagr5Y * 100) / 100 : null,
    earliestDate: sorted[0].date,
  };
}

function getHoldingKey(
  memberId: number | null,
  schemeId: number | null,
  folioNo: string | null
): string {
  return `${memberId ?? ""}|${schemeId ?? ""}|${folioNo ?? ""}`;
}

export async function getInsightsData(): Promise<InsightsData> {
  // 1. Get the latest report
  const latestReport = await db
    .select({
      id: reports.id,
      asOfDate: reports.asOfDate,
      filename: reports.filename,
      uploadedAt: reports.uploadedAt,
      cagr: reports.cagr,
    })
    .from(reports)
    .orderBy(desc(reports.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!latestReport) {
    throw new Error("No reports found in the database.");
  }

  const reportId = latestReport.id;
  const reportDate = latestReport.asOfDate;
  const financialYearStart = getFinancialYearStart(reportDate);

  // Parallelize all independent database & benchmark queries using Promise.all
  const [
    holdings,
    sips,
    memberCagrRows,
    rawTxs,
    openingReport,
    sipPayments,
    benchmarkReturns,
    zHolds,
    mHolds,
  ] = await Promise.all([
    // 1. Get all holdings for latest report (ordered by currentValue descending in SQL)
    db
      .select({
        id: holdingsSnapshot.id,
        balanceUnits: holdingsSnapshot.balanceUnits,
        purchaseNav: holdingsSnapshot.purchaseNav,
        schemeId: holdingsSnapshot.schemeId,
        schemeCodeApi: schemes.schemeCodeApi,
        purchaseValue: holdingsSnapshot.purchaseValue,
        currentValue: holdingsSnapshot.currentValue,
        gain: holdingsSnapshot.gain,
        absoluteReturn: holdingsSnapshot.absoluteReturn,
        cagr: holdingsSnapshot.cagr,
        holdingDays: holdingsSnapshot.holdingDays,
        folioNo: holdingsSnapshot.folioNo,
        memberId: holdingsSnapshot.memberId,
        memberName: familyMembers.name,
        schemeName: schemes.name,
        schemeCategory: schemes.category,
      })
      .from(holdingsSnapshot)
      .innerJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
      .innerJoin(familyMembers, eq(holdingsSnapshot.memberId, familyMembers.id))
      .where(eq(holdingsSnapshot.reportId, reportId))
      .orderBy(desc(holdingsSnapshot.currentValue)),

    // 2. Get all SIP mandates (ordered by member name & scheme name in SQL)
    db
      .select({
        memberName: familyMembers.name,
        schemeName: schemes.name,
        schemeCategory: schemes.category,
        monthlyAmount: sipMandates.monthlyAmount,
        startMonth: sipMandates.startMonth,
        isActive: sipMandates.isActive,
      })
      .from(sipMandates)
      .innerJoin(familyMembers, eq(sipMandates.memberId, familyMembers.id))
      .innerJoin(schemes, eq(sipMandates.schemeId, schemes.id))
      .orderBy(familyMembers.name, schemes.name),

    // 3. Get member CAGRs for latest report (ordered by CAGR descending in SQL)
    db
      .select({
        memberName: familyMembers.name,
        cagr: memberReportCagrs.cagr,
      })
      .from(memberReportCagrs)
      .innerJoin(
        familyMembers,
        eq(memberReportCagrs.memberId, familyMembers.id)
      )
      .where(eq(memberReportCagrs.reportId, reportId))
      .orderBy(desc(memberReportCagrs.cagr)),

    // 4. Get transaction history up to report date (ordered by date descending in SQL)
    db
      .select({
        id: transactions.id,
        memberId: transactions.memberId,
        schemeId: transactions.schemeId,
        folioNo: transactions.folioNo,
        date: transactions.date,
        type: transactions.type,
        transactionType: transactions.transactionType,
        units: transactions.units,
        nav: transactions.nav,
        amount: transactions.amount,
        sourceReportId: transactions.sourceReportId,
        schemeCategory: schemes.category,
        schemeName: schemes.name,
        memberName: familyMembers.name,
      })
      .from(transactions)
      .leftJoin(schemes, eq(transactions.schemeId, schemes.id))
      .leftJoin(familyMembers, eq(transactions.memberId, familyMembers.id))
      .where(lte(transactions.date, reportDate))
      .orderBy(desc(transactions.date), desc(transactions.id)),

    // 5. Get opening report for financial year
    db
      .select({ id: reports.id })
      .from(reports)
      .where(lt(reports.asOfDate, financialYearStart))
      .orderBy(desc(reports.asOfDate))
      .limit(1)
      .then((rows) => rows[0]),

    // 6. Get SIP transactions
    db
      .select({
        month: sipTransactions.month,
        amount: sipTransactions.amount,
        memberId: sipMandates.memberId,
        schemeId: sipMandates.schemeId,
        folioNo: sipMandates.folioNo,
        category: schemes.category,
        schemeName: schemes.name,
        schemeCodeApi: schemes.schemeCodeApi,
      })
      .from(sipTransactions)
      .innerJoin(sipMandates, eq(sipTransactions.sipMandateId, sipMandates.id))
      .leftJoin(schemes, eq(sipMandates.schemeId, schemes.id)),

    // 7. Benchmark returns
    getBenchmarkReturns(reportDate),

    // 8. Zerodha stock holdings
    db
      .select({
        quantity: zerodhaHoldings.quantity,
        averagePrice: zerodhaHoldings.averagePrice,
        currentPrice: zerodhaHoldings.currentPrice,
        symbol: zerodhaSchemes.name,
        holdingType: zerodhaSchemes.holdingType,
      })
      .from(zerodhaHoldings)
      .leftJoin(
        zerodhaSchemes,
        eq(zerodhaHoldings.schemeId, zerodhaSchemes.id)
      ),

    // 9. MSFL stock holdings
    db
      .select({
        quantity: msflHoldings.quantity,
        averagePrice: msflHoldings.averagePrice,
        currentPrice: msflHoldings.currentPrice,
        symbol: msflSchemes.name,
      })
      .from(msflHoldings)
      .leftJoin(msflSchemes, eq(msflHoldings.schemeId, msflSchemes.id)),
  ]);

  // Compute aggregations
  const totalInvested = holdings.reduce((s, h) => s + h.purchaseValue, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalGain = holdings.reduce((s, h) => s + h.gain, 0);
  const absReturn = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const totalMonthlySip = sips.reduce((s, m) => s + m.monthlyAmount, 0);
  const uniqueSchemeNames = new Set(holdings.map((h) => h.schemeName));
  const uniqueMemberIds = new Set(
    holdings.map((h) => h.memberId).filter(Boolean)
  );

  const overallTxs = rawTxs
    .filter((tx) => {
      const tType = (tx.transactionType || tx.type || "").toUpperCase().trim();
      if (tType.startsWith("SYSTEMATIC TRANSFER") || tType.startsWith("STP"))
        return false;
      return isBuyTransactionType(tType) || isSellTransactionType(tType);
    })
    .map((tx) => ({
      date: tx.date,
      type: tx.type as "BUY" | "SELL",
      transactionType: tx.transactionType || tx.type || undefined,
      amount: tx.amount,
      units: tx.units,
    }));

  const openingHoldings = openingReport
    ? await db
        .select({
          currentValue: holdingsSnapshot.currentValue,
          category: schemes.category,
          schemeName: schemes.name,
        })
        .from(holdingsSnapshot)
        .innerJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
        .where(eq(holdingsSnapshot.reportId, openingReport.id))
    : [];

  const openingBalances = createEmptyFinancialYearBalances();
  const closingBalances = createEmptyFinancialYearBalances();
  for (const holding of holdings) {
    if (
      isIncludedInMutualFundSnapshot(holding.schemeCategory, holding.schemeName)
    ) {
      closingBalances[
        getFinancialYearAssetClass(holding.schemeCategory, holding.schemeName)
      ] += holding.currentValue;
    }
  }

  const financialYearTransactions: FinancialYearTransaction[] = rawTxs
    .filter((tx) => tx.date >= financialYearStart && tx.date <= reportDate)
    .map((tx) => ({
      date: tx.date,
      type: isSellTransactionType(tx.type) ? "SELL" : "BUY",
      amount: tx.amount,
      category: tx.schemeCategory || "",
      schemeName: tx.schemeName || "",
    }));

  for (const payment of sipPayments) {
    const paymentDate = getMonthStartFromLabel(payment.month);
    if (
      paymentDate &&
      paymentDate >= financialYearStart &&
      paymentDate <= reportDate &&
      payment.amount > 0
    ) {
      financialYearTransactions.push({
        date: paymentDate,
        type: "BUY",
        amount: payment.amount,
        category: payment.category || "Equity",
        schemeName: payment.schemeName || "",
      });
    }
  }

  if (openingReport) {
    for (const holding of openingHoldings) {
      if (
        isIncludedInMutualFundSnapshot(holding.category, holding.schemeName)
      ) {
        openingBalances[
          getFinancialYearAssetClass(holding.category, holding.schemeName)
        ] += holding.currentValue;
      }
    }
  } else {
    const transactionUnits = new Map<string, number>();
    for (const transaction of rawTxs) {
      if (transaction.date < financialYearStart) continue;
      const key = getHoldingKey(
        transaction.memberId,
        transaction.schemeId,
        transaction.folioNo
      );
      const signedUnits =
        transaction.type === "SELL" ? -transaction.units : transaction.units;
      transactionUnits.set(key, (transactionUnits.get(key) || 0) + signedUnits);
    }

    const schemeCodes = Array.from(
      new Set(
        holdings
          .map((holding) => holding.schemeCodeApi)
          .filter((code): code is string => Boolean(code))
      )
    );
    const navHistoryByCode = new Map<
      string,
      Array<{ date: string; nav: number }>
    >();
    if (schemeCodes.length > 0) {
      const rows = await db
        .select({
          schemeCode: schemeNavHistory.schemeCode,
          date: schemeNavHistory.date,
          nav: schemeNavHistory.nav,
        })
        .from(schemeNavHistory)
        .where(inArray(schemeNavHistory.schemeCode, schemeCodes));

      for (const row of rows) {
        let list = navHistoryByCode.get(row.schemeCode);
        if (!list) {
          list = [];
          navHistoryByCode.set(row.schemeCode, list);
        }
        list.push({ date: row.date, nav: row.nav });
      }
    }

    const sipUnits = new Map<string, number>();
    for (const payment of sipPayments) {
      const paymentDate = getMonthStartFromLabel(payment.month);
      if (
        !paymentDate ||
        paymentDate < financialYearStart ||
        payment.amount <= 0
      ) {
        continue;
      }
      const navHistory = payment.schemeCodeApi
        ? navHistoryByCode.get(payment.schemeCodeApi) || []
        : [];
      const nav = findNavAtOrBefore(navHistory, paymentDate);
      if (!nav || nav <= 0) continue;
      const key = getHoldingKey(
        payment.memberId,
        payment.schemeId,
        payment.folioNo
      );
      sipUnits.set(key, (sipUnits.get(key) || 0) + payment.amount / nav);
    }

    for (const holding of holdings) {
      if (
        !isIncludedInMutualFundSnapshot(
          holding.schemeCategory,
          holding.schemeName
        )
      ) {
        continue;
      }
      const key = getHoldingKey(
        holding.memberId,
        holding.schemeId,
        holding.folioNo
      );
      const unitsAtStart =
        holding.balanceUnits -
        (transactionUnits.get(key) || 0) -
        (sipUnits.get(key) || 0);
      const navHistory = holding.schemeCodeApi
        ? navHistoryByCode.get(holding.schemeCodeApi) || []
        : [];
      const openingNav =
        findNavAtOrBefore(navHistory, financialYearStart) ||
        holding.purchaseNav;
      if (unitsAtStart > 0 && openingNav > 0) {
        openingBalances[
          getFinancialYearAssetClass(holding.schemeCategory, holding.schemeName)
        ] += unitsAtStart * openingNav;
      }
    }
  }

  const currentFinancialYearSnapshot = calculateFinancialYearSnapshot(
    reportDate,
    openingBalances,
    closingBalances,
    financialYearTransactions
  );

  const { portfolioXirr, benchmarkXirr, benchmarkCagrSinceInception } =
    await calculateAlpha(overallTxs, reportDate, totalCurrent);

  // Category allocation
  const categoryMap = new Map<
    string,
    { invested: number; current: number; gain: number }
  >();
  for (const h of holdings) {
    // if ((h.balanceUnits ?? 0) <= 0.0001) continue;
    const cat = h.schemeCategory;
    const existing = categoryMap.get(cat) ?? {
      invested: 0,
      current: 0,
      gain: 0,
    };
    categoryMap.set(cat, {
      invested: existing.invested + h.purchaseValue,
      current: existing.current + h.currentValue,
      gain: existing.gain + h.gain,
    });
  }
  const categoryAllocation = Array.from(categoryMap.entries())
    .map(([category, vals]) => ({
      category,
      invested: vals.invested,
      current: vals.current,
      gain: vals.gain,
      absReturn:
        vals.invested > 0
          ? Math.round((vals.gain / vals.invested) * 1000) / 10
          : 0,
      allocation:
        totalCurrent > 0
          ? Math.round((vals.current / totalCurrent) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.current - a.current);

  // Per-scheme aggregation
  const schemeMap = new Map<
    string,
    {
      category: string;
      invested: number;
      current: number;
      gain: number;
      weightedCagrSum: number;
      holdingCount: number;
      memberIds: Set<number>;
      holdingsList: Array<{
        holdingId: number;
        memberName: string;
        folioNo: string;
        invested: number;
        current: number;
        gain: number;
        cagr: number;
        holdingDays: number;
      }>;
    }
  >();
  for (const h of holdings) {
    // if ((h.balanceUnits ?? 0) <= 0.0001) continue;
    const key = h.schemeName;
    const existing = schemeMap.get(key);
    const holdingItem = {
      holdingId: h.id,
      memberName: h.memberName,
      folioNo: h.folioNo,
      invested: h.purchaseValue,
      current: h.currentValue,
      gain: h.gain,
      cagr: h.cagr,
      holdingDays: h.holdingDays,
    };
    if (!existing) {
      schemeMap.set(key, {
        category: h.schemeCategory,
        invested: h.purchaseValue,
        current: h.currentValue,
        gain: h.gain,
        weightedCagrSum: h.cagr * h.currentValue,
        holdingCount: 1,
        memberIds: new Set(h.memberId != null ? [h.memberId as number] : []),
        holdingsList: [holdingItem],
      });
    } else {
      existing.invested += h.purchaseValue;
      existing.current += h.currentValue;
      existing.gain += h.gain;
      existing.weightedCagrSum += h.cagr * h.currentValue;
      existing.holdingCount += 1;
      if (h.memberId != null) existing.memberIds.add(h.memberId as number);
      existing.holdingsList.push(holdingItem);
    }
  }

  // Include zero value / past sold funds from transaction history if not already present in schemeMap
  const txSchemeFolioMap = new Map<
    string,
    Map<
      string,
      { memberId: number | null; memberName: string; folioNo: string }
    >
  >();

  for (const tx of rawTxs) {
    if (!tx.schemeName) continue;
    let folioMap = txSchemeFolioMap.get(tx.schemeName);
    if (!folioMap) {
      folioMap = new Map();
      txSchemeFolioMap.set(tx.schemeName, folioMap);
    }
    const folioKey = `${tx.memberId || 0}_${tx.folioNo || ""}`;
    if (!folioMap.has(folioKey)) {
      folioMap.set(folioKey, {
        memberId: tx.memberId,
        memberName: tx.memberName || "Family Member",
        folioNo: tx.folioNo || "",
      });
    }
  }

  for (const [schemeName, folioMap] of txSchemeFolioMap.entries()) {
    if (!schemeMap.has(schemeName)) {
      const firstTx = rawTxs.find((t) => t.schemeName === schemeName);
      const category = firstTx?.schemeCategory || "Other";
      const memberIds = new Set<number>();
      const holdingsList: Array<{
        holdingId: number;
        isZeroBalance?: boolean;
        isSold?: boolean;
        memberName: string;
        folioNo: string;
        invested: number;
        current: number;
        gain: number;
        cagr: number;
        holdingDays: number;
      }> = [];

      for (const f of folioMap.values()) {
        if (f.memberId != null) memberIds.add(f.memberId);
        holdingsList.push({
          holdingId: firstTx ? Math.abs(firstTx.id) : 1,
          isZeroBalance: true,
          isSold: true,
          memberName: f.memberName,
          folioNo: f.folioNo,
          invested: 0,
          current: 0,
          gain: 0,
          cagr: 0,
          holdingDays: 0,
        });
      }

      schemeMap.set(schemeName, {
        category,
        invested: 0,
        current: 0,
        gain: 0,
        weightedCagrSum: 0,
        holdingCount: holdingsList.length,
        memberIds,
        holdingsList,
      });
    }
  }
  const schemesAgg = Array.from(schemeMap.entries())
    .map(([name, vals]) => ({
      scheme: name,
      category: vals.category,
      invested: vals.invested,
      current: vals.current,
      gain: vals.gain,
      absReturn:
        vals.invested > 0
          ? Math.round((vals.gain / vals.invested) * 1000) / 10
          : 0,
      avgCagr:
        vals.current > 0
          ? Math.round((vals.weightedCagrSum / vals.current) * 100) / 100
          : vals.holdingCount > 0
            ? Math.round((vals.weightedCagrSum / vals.holdingCount) * 100) / 100
            : 0,
      memberCount: vals.memberIds.size,
      holdings: vals.holdingsList,
    }))
    .sort((a, b) => b.avgCagr - a.avgCagr);

  // SIPs
  const sipsOut = sips.map((s) => ({
    member: s.memberName,
    scheme: s.schemeName,
    category: s.schemeCategory,
    monthlyAmount: s.monthlyAmount,
    startMonth: s.startMonth ?? "",
  }));

  const roundedPortfolioXirr = Math.round(portfolioXirr * 100) / 100;
  const roundedBenchmarkXirr = Math.round(benchmarkXirr * 100) / 100;
  const roundedBenchmarkCagrSinceInception =
    Math.round(benchmarkCagrSinceInception * 100) / 100;

  // Pre-index rawTxs by holding key (memberId_schemeId_folioNo) for O(1) matching
  const txsByHoldingMap = new Map<string, typeof rawTxs>();
  const sellHoldingKeys = new Set<string>();

  for (const t of rawTxs) {
    const key = `${t.memberId}_${t.schemeId}_${t.folioNo || ""}`;
    let list = txsByHoldingMap.get(key);
    if (!list) {
      list = [];
      txsByHoldingMap.set(key, list);
    }
    list.push(t);
    if (t.type === "SELL") {
      sellHoldingKeys.add(key);
    }
  }

  // Sold Holdings & Partially Sold Holdings Analysis
  const activeHoldingsByKey = new Map<string, (typeof holdings)[0]>();
  const zeroBalanceHoldingsByKey = new Map<string, (typeof holdings)[0]>();

  for (const h of holdings) {
    const key = `${h.memberId}_${h.schemeId}_${h.folioNo || ""}`;
    if ((h.balanceUnits ?? 0) > 0.0001 && (h.currentValue ?? 0) > 0) {
      activeHoldingsByKey.set(key, h);
    } else {
      zeroBalanceHoldingsByKey.set(key, h);
    }
  }

  const soldHoldings: SoldHoldingItem[] = [];
  const partiallySoldHoldings: SoldHoldingItem[] = [];

  for (const [key, matchingTxs] of txsByHoldingMap.entries()) {
    const buyTxs = matchingTxs.filter((t) => t.type === "BUY");
    const sellTxs = matchingTxs.filter((t) => t.type === "SELL");

    if (sellTxs.length === 0) continue;

    const activeHolding = activeHoldingsByKey.get(key);
    const zeroHolding = zeroBalanceHoldingsByKey.get(key);
    const firstTx = matchingTxs[0];

    const totalBuyAmount = buyTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalBuyUnits = buyTxs.reduce((acc, t) => acc + (t.units || 0), 0);
    const sellAmount = sellTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalSellUnits = sellTxs.reduce((acc, t) => acc + (t.units || 0), 0);

    // Calculate proportional cost basis if only a subset of bought units were sold (e.g. transfers/switches)
    const unitRatio =
      totalBuyUnits > 0 ? Math.min(1, totalSellUnits / totalBuyUnits) : 1;
    const buyAmount =
      unitRatio > 0 && unitRatio < 0.999
        ? totalBuyAmount * unitRatio
        : totalBuyAmount;

    const buyDates = buyTxs.map((t) => t.date).sort();
    const sellDates = sellTxs.map((t) => t.date).sort();
    const firstBuyDate = buyDates.length > 0 ? buyDates[0] : null;
    const lastSellDate =
      sellDates.length > 0 ? sellDates[sellDates.length - 1] : null;

    let holdingDays =
      activeHolding?.holdingDays || zeroHolding?.holdingDays || 0;
    if (firstBuyDate && lastSellDate) {
      const d1 = new Date(firstBuyDate);
      const d2 = new Date(lastSellDate);
      holdingDays = Math.max(
        1,
        Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24))
      );
    }

    if (!activeHolding) {
      // Fully Sold Holding
      const netProfit = sellAmount - buyAmount;
      const absReturn =
        buyAmount > 0 ? Math.round((netProfit / buyAmount) * 10000) / 100 : 0;
      const years = holdingDays / 365.25;
      let cagr = zeroHolding?.cagr || 0;
      if (!cagr && years > 0 && buyAmount > 0 && sellAmount > 0) {
        cagr =
          Math.round(
            (Math.pow(sellAmount / buyAmount, 1 / years) - 1) * 10000
          ) / 100;
      }

      soldHoldings.push({
        holdingId: zeroHolding?.id || Math.abs(firstTx.id),
        isZeroBalance: true,
        isSold: true,
        memberId: zeroHolding?.memberId || firstTx.memberId,
        memberName:
          zeroHolding?.memberName || firstTx.memberName || "Family Member",
        schemeId: zeroHolding?.schemeId || firstTx.schemeId,
        schemeName: zeroHolding?.schemeName || firstTx.schemeName || "",
        schemeCategory:
          zeroHolding?.schemeCategory || firstTx.schemeCategory || "Other",
        folioNo: zeroHolding?.folioNo || firstTx.folioNo || "",
        buyAmount: Math.round(buyAmount * 100) / 100,
        sellAmount: Math.round(sellAmount * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        absReturn,
        cagr,
        holdingDays,
        firstBuyDate,
        lastSellDate,
      });
    } else {
      // Partially Sold Holding
      const netProfit = sellAmount - buyAmount + activeHolding.currentValue;
      const totalCapitalDeployed = buyAmount;
      const absReturn =
        totalCapitalDeployed > 0
          ? Math.round((netProfit / totalCapitalDeployed) * 10000) / 100
          : 0;

      partiallySoldHoldings.push({
        holdingId: activeHolding.id,
        memberId: activeHolding.memberId,
        memberName: activeHolding.memberName,
        schemeId: activeHolding.schemeId,
        schemeName: activeHolding.schemeName,
        schemeCategory: activeHolding.schemeCategory,
        folioNo: activeHolding.folioNo || "",
        buyAmount: Math.round(buyAmount * 100) / 100,
        sellAmount: Math.round(sellAmount * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        absReturn,
        cagr: activeHolding.cagr || 0,
        holdingDays,
        firstBuyDate,
        lastSellDate,
        currentValue: Math.round(activeHolding.currentValue * 100) / 100,
        remainingUnits:
          Math.round((activeHolding.balanceUnits ?? 0) * 1000) / 1000,
      });
    }
  }

  soldHoldings.sort((a, b) => b.netProfit - a.netProfit);
  partiallySoldHoldings.sort((a, b) => b.netProfit - a.netProfit);

  // Compute detailed per-member metrics (CAGR, XIRR, Abs Return, Invested, CurrentValue)
  const allMemberNames = Array.from(
    new Set([
      ...memberCagrRows.map((r) => r.memberName),
      ...holdings.map((h) => h.memberName).filter(Boolean),
    ])
  );

  const memberMetrics = await Promise.all(
    allMemberNames.map(async (name) => {
      const memberHoldings = holdings.filter((h) => h.memberName === name);
      const activeHoldings = memberHoldings.filter(
        (h) => (h.balanceUnits ?? 0) > 0.0001 || (h.currentValue ?? 0) > 0
      );

      const invested = activeHoldings.reduce(
        (acc, h) => acc + h.purchaseValue,
        0
      );
      const currentValue = activeHoldings.reduce(
        (acc, h) => acc + h.currentValue,
        0
      );
      const gain = currentValue - invested;
      const memberAbsReturn =
        invested > 0 ? Math.round((gain / invested) * 1000) / 10 : 0;

      const storedObj = memberCagrRows.find((r) => r.memberName === name);
      const memberCagr =
        storedObj !== undefined && storedObj.cagr !== null
          ? storedObj.cagr
          : invested > 0
            ? activeHoldings.reduce(
                (acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0),
                0
              ) / (invested || 1)
            : 0;

      const memberTxs = rawTxs
        .filter((tx) => tx.memberName === name)
        .map((tx) => ({
          date: tx.date,
          type: tx.type as "BUY" | "SELL",
          amount: tx.amount,
          units: tx.units,
        }));

      let memberXirr = memberCagr;
      if (memberTxs.length >= 1 && currentValue > 0) {
        const metrics = await calculateAlpha(
          memberTxs,
          reportDate,
          currentValue
        );
        memberXirr = metrics.portfolioXirr;
      }

      return {
        memberName: name,
        cagr: Math.round(memberCagr * 100) / 100,
        xirr: Math.round(memberXirr * 100) / 100,
        absReturn: Math.round(memberAbsReturn * 100) / 100,
        invested: Math.round(invested * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        gain: Math.round(gain * 100) / 100,
      };
    })
  );

  return {
    reportDate,
    totals: {
      invested: Math.round(totalInvested * 100) / 100,
      current: Math.round(totalCurrent * 100) / 100,
      gain: Math.round(totalGain * 100) / 100,
      absReturn: Math.round(absReturn * 100) / 100,
      totalMonthlySip: Math.round(totalMonthlySip),
      uniqueSchemes: uniqueSchemeNames.size,
      memberCount: uniqueMemberIds.size,
      portfolioXirr: roundedPortfolioXirr,
      benchmarkXirr: roundedBenchmarkXirr,
      benchmarkCagrSinceInception: roundedBenchmarkCagrSinceInception,
      alpha:
        Math.round((roundedPortfolioXirr - roundedBenchmarkXirr) * 100) / 100,
    },
    memberCagrs: memberMetrics.map((r) => ({
      memberName: r.memberName,
      cagr: r.cagr,
      xirr: r.xirr,
      absReturn: r.absReturn,
      invested: r.invested,
      currentValue: r.currentValue,
      gain: r.gain,
    })),
    categoryAllocation,
    schemes: schemesAgg,
    sips: sipsOut,
    soldHoldings,
    partiallySoldHoldings,
    benchmarkReturns,
    currentFinancialYearSnapshot,
    zerodhaHoldings: zHolds.map((h) => ({
      symbol: h.symbol || "",
      quantity: h.quantity,
      averagePrice: h.averagePrice,
      currentPrice: h.currentPrice,
      holdingType: h.holdingType || "",
    })),
    msflHoldings: mHolds.map((h) => ({
      symbol: h.symbol || "",
      quantity: h.quantity,
      averagePrice: h.averagePrice,
      currentPrice: h.currentPrice,
    })),
  };
}

export async function getFyTrackerData(
  selectedFyLabel?: string
): Promise<FyTrackerData> {
  const latestReport = await db
    .select({
      id: reports.id,
      asOfDate: reports.asOfDate,
    })
    .from(reports)
    .orderBy(desc(reports.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!latestReport) {
    throw new Error("No reports found in the database.");
  }

  const reportDate = latestReport.asOfDate;
  const reportId = latestReport.id;

  const [holdings, rawTxs] = await Promise.all([
    db
      .select({
        id: holdingsSnapshot.id,
        schemeId: holdingsSnapshot.schemeId,
        memberId: holdingsSnapshot.memberId,
        folioNo: holdingsSnapshot.folioNo,
        balanceUnits: holdingsSnapshot.balanceUnits,
        purchaseNav: holdingsSnapshot.purchaseNav,
        currentValue: holdingsSnapshot.currentValue,
        purchaseValue: holdingsSnapshot.purchaseValue,
        schemeCodeApi: schemes.schemeCodeApi,
        schemeCategory: schemes.category,
        schemeName: schemes.name,
      })
      .from(holdingsSnapshot)
      .innerJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
      .where(eq(holdingsSnapshot.reportId, reportId)),
    db
      .select({
        id: transactions.id,
        schemeId: transactions.schemeId,
        memberId: transactions.memberId,
        folioNo: transactions.folioNo,
        date: transactions.date,
        type: transactions.type,
        units: transactions.units,
        amount: transactions.amount,
        schemeCategory: schemes.category,
        schemeName: schemes.name,
      })
      .from(transactions)
      .leftJoin(schemes, eq(transactions.schemeId, schemes.id))
      .where(lte(transactions.date, reportDate))
      .orderBy(desc(transactions.date)),
  ]);

  const txDates = rawTxs.map((t) => t.date);
  const availableFys = getAvailableFinancialYears(txDates, reportDate);

  const selectedFy =
    availableFys.find((f) => f.label === selectedFyLabel) || availableFys[0];

  // Scheme NAV history cache
  const schemeCodes = Array.from(
    new Set(
      holdings
        .map((h) => h.schemeCodeApi)
        .filter((code): code is string => Boolean(code))
    )
  );
  const navRows =
    schemeCodes.length > 0
      ? await db
          .select({
            schemeCode: schemeNavHistory.schemeCode,
            date: schemeNavHistory.date,
            nav: schemeNavHistory.nav,
          })
          .from(schemeNavHistory)
          .where(inArray(schemeNavHistory.schemeCode, schemeCodes))
      : [];

  const navMap = new Map<string, Array<{ date: string; nav: number }>>();
  for (const r of navRows) {
    let list = navMap.get(r.schemeCode);
    if (!list) {
      list = [];
      navMap.set(r.schemeCode, list);
    }
    list.push({ date: r.date, nav: r.nav });
  }

  // Dynamic Valuation & Balance calculator at any target date T
  const computeValuationAtDate = (targetDate: string) => {
    const balances = createEmptyFinancialYearBalances();
    let totalVal = 0;

    for (const h of holdings) {
      if (!isIncludedInMutualFundSnapshot(h.schemeCategory, h.schemeName))
        continue;

      if (targetDate >= reportDate) {
        const assetClass = getFinancialYearAssetClass(
          h.schemeCategory,
          h.schemeName
        );
        balances[assetClass] += h.currentValue;
        totalVal += h.currentValue;
        continue;
      }

      const txsAfterTarget = rawTxs.filter(
        (t) =>
          t.schemeId === h.schemeId &&
          t.memberId === h.memberId &&
          t.folioNo === h.folioNo &&
          t.date >= targetDate
      );

      let unitsAtTarget = h.balanceUnits;
      for (const t of txsAfterTarget) {
        if (isBuyTransactionType(t.type)) unitsAtTarget -= t.units;
        else if (isSellTransactionType(t.type)) unitsAtTarget += t.units;
      }

      if (unitsAtTarget <= 0.001) continue;

      let navAtTarget = h.purchaseNav;
      if (h.schemeCodeApi && navMap.has(h.schemeCodeApi)) {
        const foundNav = findNavAtOrBefore(
          navMap.get(h.schemeCodeApi)!,
          targetDate
        );
        if (foundNav && foundNav > 0) navAtTarget = foundNav;
      }

      const valAtTarget = unitsAtTarget * navAtTarget;
      const assetClass = getFinancialYearAssetClass(
        h.schemeCategory,
        h.schemeName
      );
      balances[assetClass] += valAtTarget;
      totalVal += valAtTarget;
    }

    return { balances, totalVal };
  };

  // 1. Calculate opening & closing balances & valuation dynamically
  const { balances: openingBalances, totalVal: openingValuation } =
    computeValuationAtDate(selectedFy.startDate);

  const { balances: closingBalances, totalVal: closingValuation } =
    computeValuationAtDate(selectedFy.endDate);

  // 2. Pre-FY cumulative invested capital
  const preFyTxs = rawTxs.filter((t) => t.date < selectedFy.startDate);
  const previouslyInvested = preFyTxs.reduce((sum, t) => {
    return sum + (isBuyTransactionType(t.type) ? t.amount : -t.amount);
  }, 0);

  // 3. FY transactions
  const fyTxs = rawTxs.filter(
    (t) => t.date >= selectedFy.startDate && t.date <= selectedFy.endDate
  );

  let fyInvested = 0;
  let fySold = 0;
  for (const t of fyTxs) {
    if (isBuyTransactionType(t.type)) fyInvested += t.amount;
    else if (isSellTransactionType(t.type)) fySold += t.amount;
  }
  const netAddition = fyInvested - fySold;
  const netGain = closingValuation - (openingValuation + netAddition);
  const capitalInvested = openingValuation + fyInvested;

  // 4. Calculate Absolute Return (%) & CAGR (%)
  const absReturn = capitalInvested > 0 ? (netGain / capitalInvested) * 100 : 0;

  const startT = new Date(selectedFy.startDate).getTime();
  const endT = new Date(selectedFy.endDate).getTime();
  const years = (endT - startT) / (365.25 * 86400 * 1000);
  const cagr =
    years > 0 && capitalInvested > 0
      ? (Math.pow((closingValuation + fySold) / capitalInvested, 1 / years) -
          1) *
        100
      : 0;

  // 5. Generate Snapshot Rows with Abs Return & XIRR
  const fySnapshotTxs: FinancialYearTransaction[] = fyTxs.map((t) => ({
    date: t.date,
    type: isSellTransactionType(t.type) ? "SELL" : "BUY",
    amount: t.amount,
    category: t.schemeCategory || "",
    schemeName: t.schemeName || "",
  }));

  const snapshot = calculateFinancialYearSnapshot(
    selectedFy.endDate,
    openingBalances,
    closingBalances,
    fySnapshotTxs
  );

  const xirrRow = snapshot.rows.find((r) => r.label === "XIRR (%)");
  const xirr = xirrRow?.totalXirr || 0;

  // 6. Build Multi-Year Comparison Rows for all FYs
  const comparisonRows: FyMultiYearComparisonRow[] = [];
  for (const fy of availableFys) {
    const fySubTxs = rawTxs.filter(
      (t) => t.date >= fy.startDate && t.date <= fy.endDate
    );
    let fyBuy = 0;
    let fySell = 0;
    for (const t of fySubTxs) {
      if (isBuyTransactionType(t.type)) fyBuy += t.amount;
      else if (isSellTransactionType(t.type)) fySell += t.amount;
    }

    const openInvested = rawTxs
      .filter((t) => t.date < fy.startDate)
      .reduce(
        (s, t) => s + (isBuyTransactionType(t.type) ? t.amount : -t.amount),
        0
      );

    const { totalVal: openVal } = computeValuationAtDate(fy.startDate);
    const { totalVal: closeVal } = computeValuationAtDate(fy.endDate);

    const gain = closeVal - (openVal + (fyBuy - fySell));
    const cap = openVal + fyBuy;
    const fyAbs = cap > 0 ? (gain / cap) * 100 : 0;

    const fyStartT = new Date(fy.startDate).getTime();
    const fyEndT = new Date(fy.endDate).getTime();
    const fyYears = (fyEndT - fyStartT) / (365.25 * 86400 * 1000);
    const fyCagr =
      fyYears > 0 && cap > 0
        ? (Math.pow((closeVal + fySell) / cap, 1 / fyYears) - 1) * 100
        : 0;

    // FY XIRR
    const fyCashFlows = [];
    if (openVal > 0)
      fyCashFlows.push({ amount: -openVal, date: new Date(fy.startDate) });
    for (const t of fySubTxs) {
      fyCashFlows.push({
        amount: isBuyTransactionType(t.type) ? -t.amount : t.amount,
        date: new Date(t.date),
      });
    }
    if (closeVal > 0)
      fyCashFlows.push({ amount: closeVal, date: new Date(fy.endDate) });
    const fyXirr = calculateXIRR(fyCashFlows);

    // Benchmark calculations for FY
    const benchAlpha = await calculateAlpha(
      fySubTxs.map((t) => ({
        id: t.id,
        date: t.date,
        type: t.type as "BUY" | "SELL",
        amount: t.amount,
        schemeName: t.schemeName || "",
        schemeCategory: t.schemeCategory || "",
      })),
      fy.endDate,
      closeVal,
      "120716"
    );
    const benchmarkXirr = benchAlpha.benchmarkXirr;

    let benchmarkCagr = benchmarkXirr;
    if (navMap.has("120716")) {
      const bNavs = navMap.get("120716")!;
      const startBNav = findNavAtOrBefore(bNavs, fy.startDate);
      const endBNav = findNavAtOrBefore(bNavs, fy.endDate);
      if (startBNav && endBNav && startBNav > 0 && fyYears > 0) {
        benchmarkCagr = (Math.pow(endBNav / startBNav, 1 / fyYears) - 1) * 100;
      }
    }

    comparisonRows.push({
      fyLabel: fy.label,
      startDate: fy.startDate,
      endDate: fy.endDate,
      openingInvested: Math.round(openInvested * 100) / 100,
      fyInvested: Math.round(fyBuy * 100) / 100,
      fySold: Math.round(fySell * 100) / 100,
      closingValuation: Math.round(closeVal * 100) / 100,
      netGain: Math.round(gain * 100) / 100,
      absReturn: Math.round(fyAbs * 100) / 100,
      xirr: Math.round(fyXirr * 100) / 100,
      cagr: Math.round(fyCagr * 100) / 100,
      benchmarkXirr: Math.round(benchmarkXirr * 100) / 100,
      benchmarkCagr: Math.round(benchmarkCagr * 100) / 100,
    });
  }

  return {
    reportDate,
    availableFys,
    selectedFy,
    summary: {
      previouslyInvested: Math.round(previouslyInvested * 100) / 100,
      fyInvested: Math.round(fyInvested * 100) / 100,
      fySold: Math.round(fySold * 100) / 100,
      netAddition: Math.round(netAddition * 100) / 100,
      closingValuation: Math.round(closingValuation * 100) / 100,
      netGain: Math.round(netGain * 100) / 100,
      absReturn: Math.round(absReturn * 100) / 100,
      xirr: Math.round(xirr * 100) / 100,
      cagr: Math.round(cagr * 100) / 100,
    },
    snapshot,
    comparisonRows,
  };
}
