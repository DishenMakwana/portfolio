import { db } from "@/db/db";
import {
  reports,
  familyMembers,
  schemes,
  holdingsSnapshot,
  sipMandates,
  memberReportCagrs,
  zerodhaHoldings,
  zerodhaSchemes,
  msflHoldings,
  msflSchemes,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getBenchmarkHistory } from "@/lib/alpha";
import type { BenchmarkReturns, InsightsData } from "@/types/insights";

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

export async function getInsightsData(): Promise<InsightsData> {
  // 1. Get the latest report
  const latestReport = await db
    .select()
    .from(reports)
    .orderBy(desc(reports.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!latestReport) {
    throw new Error("No reports found in the database.");
  }

  const reportId = latestReport.id;
  const reportDate = latestReport.asOfDate;

  // 2. Get all holdings for the latest report joined with schemes and members
  const holdings = await db
    .select({
      id: holdingsSnapshot.id,
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
    .where(eq(holdingsSnapshot.reportId, reportId));

  // 3. Get all SIP mandates joined with schemes and members
  const sips = await db
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
    .innerJoin(schemes, eq(sipMandates.schemeId, schemes.id));

  // 4. Get member CAGRs for the latest report joined with members
  const memberCagrRows = await db
    .select({
      memberName: familyMembers.name,
      cagr: memberReportCagrs.cagr,
    })
    .from(memberReportCagrs)
    .innerJoin(familyMembers, eq(memberReportCagrs.memberId, familyMembers.id))
    .where(eq(memberReportCagrs.reportId, reportId))
    .orderBy(desc(memberReportCagrs.cagr));

  // 5. Compute aggregations

  // Totals
  const totalInvested = holdings.reduce((s, h) => s + h.purchaseValue, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalGain = holdings.reduce((s, h) => s + h.gain, 0);
  const absReturn = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const totalMonthlySip = sips.reduce((s, m) => s + m.monthlyAmount, 0);
  const uniqueSchemeNames = new Set(holdings.map((h) => h.schemeName));
  const uniqueMemberIds = new Set(
    holdings.map((h) => h.memberId).filter(Boolean)
  );

  // Category allocation
  const categoryMap = new Map<
    string,
    { invested: number; current: number; gain: number }
  >();
  for (const h of holdings) {
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

  const benchmarkReturns = await getBenchmarkReturns(reportDate);

  // Fetch Zerodha and MSFL stock holdings
  const zHolds = await db
    .select({
      quantity: zerodhaHoldings.quantity,
      averagePrice: zerodhaHoldings.averagePrice,
      currentPrice: zerodhaHoldings.currentPrice,
      symbol: zerodhaSchemes.name,
      holdingType: zerodhaSchemes.holdingType,
    })
    .from(zerodhaHoldings)
    .leftJoin(zerodhaSchemes, eq(zerodhaHoldings.schemeId, zerodhaSchemes.id));
  const mHolds = await db
    .select({
      quantity: msflHoldings.quantity,
      averagePrice: msflHoldings.averagePrice,
      currentPrice: msflHoldings.currentPrice,
      symbol: msflSchemes.name,
    })
    .from(msflHoldings)
    .leftJoin(msflSchemes, eq(msflHoldings.schemeId, msflSchemes.id));

  return {
    reportDate,
    totals: {
      invested: Math.round(totalInvested),
      current: Math.round(totalCurrent),
      gain: Math.round(totalGain),
      absReturn: Math.round(absReturn * 100) / 100,
      totalMonthlySip: Math.round(totalMonthlySip),
      uniqueSchemes: uniqueSchemeNames.size,
      memberCount: uniqueMemberIds.size,
    },
    memberCagrs: memberCagrRows.map((r) => ({
      memberName: r.memberName,
      cagr: r.cagr,
    })),
    categoryAllocation,
    schemes: schemesAgg,
    sips: sipsOut,
    benchmarkReturns,
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
