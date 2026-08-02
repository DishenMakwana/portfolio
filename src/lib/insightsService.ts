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
import { getBenchmarkHistory, calculateAlpha } from "@/lib/alpha";
import {
  calculateFinancialYearSnapshot,
  createEmptyFinancialYearBalances,
  getFinancialYearAssetClass,
  findNavAtOrBefore,
  getMonthStartFromLabel,
  isIncludedInMutualFundSnapshot,
  getFinancialYearStart,
} from "@/helpers/financial-year";
import type {
  BenchmarkReturns,
  FinancialYearTransaction,
  InsightsData,
  SoldHoldingItem,
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
        units: transactions.units,
        nav: transactions.nav,
        amount: transactions.amount,
        sourceReportId: transactions.sourceReportId,
        schemeCategory: schemes.category,
        schemeName: schemes.name,
      })
      .from(transactions)
      .leftJoin(schemes, eq(transactions.schemeId, schemes.id))
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

  const overallTxs = rawTxs.map((tx) => ({
    date: tx.date,
    type: tx.type as "BUY" | "SELL",
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
      type: tx.type === "SELL" ? "SELL" : "BUY",
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

  const { portfolioXirr, benchmarkXirr } = await calculateAlpha(
    overallTxs,
    reportDate,
    totalCurrent
  );

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

  // Sold Holdings Analysis
  const soldHoldingsRaw = holdings.filter(
    (h) => (h.balanceUnits ?? 0) <= 0.0001 || (h.currentValue ?? 0) <= 0
  );

  const soldHoldings: SoldHoldingItem[] = [];

  for (const h of soldHoldingsRaw) {
    const key = `${h.memberId}_${h.schemeId}_${h.folioNo || ""}`;
    const matchingTxs = txsByHoldingMap.get(key) || [];

    const buyTxs = matchingTxs.filter((t) => t.type === "BUY");
    const sellTxs = matchingTxs.filter((t) => t.type === "SELL");

    const buyAmount = buyTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const sellAmount = sellTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const netProfit = sellAmount - buyAmount;
    const absReturn =
      buyAmount > 0 ? Math.round((netProfit / buyAmount) * 10000) / 100 : 0;

    const buyDates = buyTxs.map((t) => t.date).sort();
    const sellDates = sellTxs.map((t) => t.date).sort();
    const firstBuyDate = buyDates.length > 0 ? buyDates[0] : null;
    const lastSellDate =
      sellDates.length > 0 ? sellDates[sellDates.length - 1] : null;

    let holdingDays = h.holdingDays || 0;
    if (firstBuyDate && lastSellDate) {
      const d1 = new Date(firstBuyDate);
      const d2 = new Date(lastSellDate);
      holdingDays = Math.max(
        1,
        Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24))
      );
    }

    soldHoldings.push({
      holdingId: h.id,
      memberId: h.memberId,
      memberName: h.memberName,
      schemeId: h.schemeId,
      schemeName: h.schemeName,
      schemeCategory: h.schemeCategory,
      folioNo: h.folioNo || "",
      buyAmount: Math.round(buyAmount * 100) / 100,
      sellAmount: Math.round(sellAmount * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      absReturn,
      cagr: h.cagr || 0,
      holdingDays,
      firstBuyDate,
      lastSellDate,
    });
  }

  soldHoldings.sort((a, b) => b.netProfit - a.netProfit);

  // Partially Sold Holdings Analysis — active holdings that have sell transactions
  const partiallySoldRaw = holdings.filter((h) => {
    if ((h.balanceUnits ?? 0) <= 0.0001 || (h.currentValue ?? 0) <= 0)
      return false;
    const key = `${h.memberId}_${h.schemeId}_${h.folioNo || ""}`;
    return sellHoldingKeys.has(key);
  });

  const partiallySoldHoldings: SoldHoldingItem[] = [];

  for (const h of partiallySoldRaw) {
    const key = `${h.memberId}_${h.schemeId}_${h.folioNo || ""}`;
    const matchingTxs = txsByHoldingMap.get(key) || [];

    const buyTxs = matchingTxs.filter((t) => t.type === "BUY");
    const sellTxs = matchingTxs.filter((t) => t.type === "SELL");

    const buyAmount = buyTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const sellAmount = sellTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const netProfit = sellAmount - buyAmount + h.currentValue;
    const totalCapitalDeployed = buyAmount;
    const absReturn =
      totalCapitalDeployed > 0
        ? Math.round((netProfit / totalCapitalDeployed) * 10000) / 100
        : 0;

    const buyDates = buyTxs.map((t) => t.date).sort();
    const sellDates = sellTxs.map((t) => t.date).sort();
    const firstBuyDate = buyDates.length > 0 ? buyDates[0] : null;
    const lastSellDate =
      sellDates.length > 0 ? sellDates[sellDates.length - 1] : null;

    const holdingDays = h.holdingDays || 0;

    partiallySoldHoldings.push({
      holdingId: h.id,
      memberId: h.memberId,
      memberName: h.memberName,
      schemeId: h.schemeId,
      schemeName: h.schemeName,
      schemeCategory: h.schemeCategory,
      folioNo: h.folioNo || "",
      buyAmount: Math.round(buyAmount * 100) / 100,
      sellAmount: Math.round(sellAmount * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      absReturn,
      cagr: h.cagr || 0,
      holdingDays,
      firstBuyDate,
      lastSellDate,
      currentValue: Math.round(h.currentValue * 100) / 100,
      remainingUnits: Math.round((h.balanceUnits ?? 0) * 1000) / 1000,
    });
  }

  partiallySoldHoldings.sort((a, b) => b.netProfit - a.netProfit);

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
      alpha:
        Math.round((roundedPortfolioXirr - roundedBenchmarkXirr) * 100) / 100,
    },
    memberCagrs: memberCagrRows.map((r) => ({
      memberName: r.memberName,
      cagr: r.cagr,
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
