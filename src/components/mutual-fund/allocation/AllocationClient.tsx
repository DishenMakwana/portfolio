"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import AllocationFilterBar from "./AllocationFilterBar";
import AllocationOverviewSection from "./AllocationOverviewSection";
import AllocationSubCategoryAndFundSection from "./AllocationSubCategoryAndFundSection";
import AllocationCategoryAssetTableCard from "./AllocationCategoryAssetTableCard";
import AllocationEquityCapTableCard from "./AllocationEquityCapTableCard";
import AllocationSchemeGroupedTableCard from "./AllocationSchemeGroupedTableCard";
import {
  getAmcName,
  getAssetRatios,
  getCapRatios,
  getSubCategory,
  sortAllocationArray,
  mapToAllocationPercentageArray,
} from "@/helpers/allocation";
import type {
  AllocationClientProps,
  SortState,
  SchemeGroupItem,
  AllocationFlattenedSchemeRow,
} from "@/types/allocation";
import type {
  GrowwMarketCapData,
  GrowwAssetAllocationData,
} from "@/types/fund-details";

export default function AllocationClient({
  memberSummaries,
  holdings,
  selectedReport,
}: AllocationClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allMembers = useMemo(
    () =>
      [...memberSummaries]
        .map((m) => m.name)
        .sort((a, b) => a.localeCompare(b)),
    [memberSummaries]
  );

  /* ── Filter state ── */
  const [investorOpen, setInvestorOpen] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(
    () => {
      const rawMembers = searchParams.get("members");
      if (rawMembers) {
        const parsed = rawMembers
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        if (parsed.length > 0) return new Set(parsed);
      }
      return new Set(memberSummaries.map((m) => m.name));
    }
  );
  const [activeInvestors, setActiveInvestors] = useState<Set<string>>(() => {
    const rawMembers = searchParams.get("members");
    if (rawMembers) {
      const parsed = rawMembers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      if (parsed.length > 0) return new Set(parsed);
    }
    return new Set(memberSummaries.map((m) => m.name));
  });

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    const rawMembers = searchParams.get("members");
    if (rawMembers) {
      const parsed = rawMembers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      if (parsed.length > 0) {
        const s = new Set(parsed);
        setSelectedInvestors(s);
        setActiveInvestors(s);
        return;
      }
    }
    const defaultSet = new Set(memberSummaries.map((m) => m.name));
    setSelectedInvestors(defaultSet);
    setActiveInvestors(defaultSet);
  }, [searchParams, memberSummaries]);

  /* ── Card collapse state (collapsed = hidden body) ── */
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [equityCapOpen, setEquityCapOpen] = useState(false);
  const [schemeScripOpen, setSchemeScripOpen] = useState(false);

  /* ── Sort state ── */
  const [investorSort, setInvestorSort] = useState<SortState>({
    col: "value",
    dir: "desc",
  });
  const [subCatSort, setSubCatSort] = useState<SortState>({
    col: "value",
    dir: "desc",
  });
  const [amcSort, setAmcSort] = useState<SortState>({
    col: "value",
    dir: "desc",
  });
  const [catSort, setCatSort] = useState<SortState>({
    col: "total",
    dir: "desc",
  });
  const [capSort, setCapSort] = useState<SortState>({
    col: "total",
    dir: "desc",
  });

  const isAllSelected = useMemo(() => {
    return (
      allMembers.length > 0 && allMembers.every((m) => selectedInvestors.has(m))
    );
  }, [selectedInvestors, allMembers]);

  const toggleInvestor = (name: string) => {
    const next = new Set(selectedInvestors);
    if (name === "all") {
      if (isAllSelected) {
        next.clear();
      } else {
        allMembers.forEach((m) => next.add(m));
      }
    } else {
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
    }
    setSelectedInvestors(next);
  };

  const handleApply = () => {
    setActiveInvestors(new Set(selectedInvestors));
    setInvestorOpen(false);
    const membersParam =
      selectedInvestors.size === allMembers.length
        ? null
        : Array.from(selectedInvestors).join(",");
    updateUrl({ members: membersParam });
  };

  const investorLabel = useMemo(() => {
    if (selectedInvestors.size === 0) return "None Selected";
    if (isAllSelected) return "All Selected";
    return Array.from(selectedInvestors)
      .map((n) => n.split(" ")[0])
      .join(", ");
  }, [selectedInvestors, isAllSelected]);

  const makeSorter =
    (setter: React.Dispatch<React.SetStateAction<SortState>>) =>
    (col: string): void => {
      setter((prev: SortState) => ({
        col,
        dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc",
      }));
    };

  /* ── Filtered holdings ── */
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => activeInvestors.has(h.memberName));
  }, [holdings, activeInvestors]);

  /* ── Derived data ── */
  const {
    categoryData,
    subCatData,
    amcData,
    memberData,
    grandTotal,
    schemeRows,
    equityCapRows,
    schemeGrouped,
  } = useMemo(() => {
    const catMap = new Map<string, number>();
    const subCatMap = new Map<string, number>();
    const amcMap = new Map<string, number>();
    const memberMap = new Map<string, number>();
    const schemeMap = new Map<
      string,
      {
        schemeName: string;
        category: string;
        subCat: string;
        total: number;
        marketCap?: GrowwMarketCapData | null;
        assetAllocation?: GrowwAssetAllocationData | null;
      }
    >();

    for (const h of filteredHoldings) {
      catMap.set(h.category, (catMap.get(h.category) || 0) + h.currentValue);
      const subCat = getSubCategory(h.schemeName, h.category);
      subCatMap.set(subCat, (subCatMap.get(subCat) || 0) + h.currentValue);
      const amc = getAmcName(h.schemeName);
      amcMap.set(amc, (amcMap.get(amc) || 0) + h.currentValue);
      memberMap.set(
        h.memberName,
        (memberMap.get(h.memberName) || 0) + h.currentValue
      );
      const existing = schemeMap.get(h.schemeName);
      if (existing) {
        existing.total += h.currentValue;
      } else {
        schemeMap.set(h.schemeName, {
          schemeName: h.schemeName,
          category: h.category,
          subCat,
          total: h.currentValue,
          marketCap: h.marketCap,
          assetAllocation: h.assetAllocation,
        });
      }
    }

    const total = filteredHoldings.reduce((s, h) => s + h.currentValue, 0);

    const memberArr = (
      activeInvestors.has("all")
        ? memberSummaries
        : memberSummaries.filter((m) => activeInvestors.has(m.name))
    ).map((m) => ({
      name: m.name,
      value: memberMap.get(m.name) || 0,
      pct: total > 0 ? ((memberMap.get(m.name) || 0) / total) * 100 : 0,
    }));

    const schemeRowsArr: AllocationFlattenedSchemeRow[] = Array.from(
      schemeMap.values()
    ).map((s) => {
      if (s.assetAllocation) {
        const eqPct = Number(s.assetAllocation.equity) || 0;
        const debtPct = Number(s.assetAllocation.debt) || 0;
        const commPct = Number(s.assetAllocation.commodities) || 0;
        const otherPct =
          (Number(s.assetAllocation.cash) || 0) +
          (Number(s.assetAllocation.realEstate) || 0);

        return {
          schemeName: s.schemeName,
          subCat: s.subCat,
          debt: Math.round(s.total * (debtPct / 100)),
          equity: Math.round(s.total * (eqPct / 100)),
          globalEquity: 0,
          gold: Math.round(s.total * (commPct / 100)),
          other: Math.round(s.total * (otherPct / 100)),
          total: s.total,
          pct: total > 0 ? (s.total / total) * 100 : 0,
        };
      }

      const r = getAssetRatios(s.subCat);
      return {
        schemeName: s.schemeName,
        subCat: s.subCat,
        debt: Math.round(s.total * r.debt),
        equity: Math.round(s.total * r.equity),
        globalEquity: Math.round(s.total * r.globalEquity),
        gold: Math.round(s.total * r.gold),
        other: Math.round(s.total * r.other),
        total: s.total,
        pct: total > 0 ? (s.total / total) * 100 : 0,
      };
    });

    const equityCapRowsArr = Array.from(schemeMap.values())
      .filter(
        (s) =>
          s.subCat.startsWith("Equity") ||
          s.subCat.includes("SIF") ||
          s.subCat.includes("Hybrid")
      )
      .map((s) => {
        const hasRealMc =
          s.marketCap &&
          (Number(s.marketCap.largeCap) > 0 ||
            Number(s.marketCap.midCap) > 0 ||
            Number(s.marketCap.smallCap) > 0);

        if (hasRealMc && s.marketCap) {
          const eqPct =
            s.assetAllocation?.equity !== undefined &&
            s.assetAllocation?.equity !== null
              ? Number(s.assetAllocation.equity)
              : 100;
          const eqVal = s.total * (eqPct / 100);
          const lPct = Number(s.marketCap.largeCap) || 0;
          const mPct = Number(s.marketCap.midCap) || 0;
          const sPct = Number(s.marketCap.smallCap) || 0;
          const mcSum = lPct + mPct + sPct || 100;

          return {
            schemeName: s.schemeName,
            subCat: s.subCat,
            large: Math.round(eqVal * (lPct / mcSum)),
            mid: Math.round(eqVal * (mPct / mcSum)),
            small: Math.round(eqVal * (sPct / mcSum)),
            total: s.total,
            pct: 0,
          };
        }

        const isSif =
          s.subCat.includes("SIF") ||
          s.schemeName.toLowerCase().includes("sif") ||
          s.category?.toLowerCase().includes("sif");

        if (isSif) {
          return {
            schemeName: s.schemeName,
            subCat: s.subCat,
            large: Math.round(s.total * 0.6),
            mid: Math.round(s.total * 0.3),
            small: Math.round(s.total * 0.1),
            total: s.total,
            pct: 0,
          };
        }

        const r = getCapRatios(s.subCat);
        return {
          schemeName: s.schemeName,
          subCat: s.subCat,
          large: Math.round(s.total * r.large),
          mid: Math.round(s.total * r.mid),
          small: Math.round(s.total * r.small),
          total: s.total,
          pct: 0,
        };
      });

    const totalEquityCap = equityCapRowsArr.reduce((s, r) => s + r.total, 0);
    for (const r of equityCapRowsArr) {
      r.pct = totalEquityCap > 0 ? (r.total / totalEquityCap) * 100 : 0;
    }

    const groupMap = new Map<string, SchemeGroupItem>();
    for (const [, s] of schemeMap) {
      const fe = {
        name: s.schemeName,
        value: s.total,
        pct: total > 0 ? (s.total / total) * 100 : 0,
      };
      const existing = groupMap.get(s.subCat);
      if (existing) {
        existing.funds.push(fe);
        existing.subTotal += s.total;
      } else groupMap.set(s.subCat, { funds: [fe], subTotal: s.total });
    }
    const schemeGroupedArr = Array.from(groupMap.entries())
      .map(([subCat, data]) => ({
        subCat,
        funds: data.funds.sort((a, b) => b.value - a.value),
        subTotal: data.subTotal,
        pct: total > 0 ? (data.subTotal / total) * 100 : 0,
      }))
      .sort((a, b) => b.subTotal - a.subTotal);

    return {
      categoryData: mapToAllocationPercentageArray(catMap, total).sort(
        (a, b) => b.value - a.value
      ),
      subCatData: mapToAllocationPercentageArray(subCatMap, total).sort(
        (a, b) => b.value - a.value
      ),
      amcData: mapToAllocationPercentageArray(amcMap, total).sort(
        (a, b) => b.value - a.value
      ),
      memberData: memberArr,
      grandTotal: total,
      schemeRows: schemeRowsArr,
      equityCapRows: equityCapRowsArr,
      schemeGrouped: schemeGroupedArr,
    };
  }, [filteredHoldings, memberSummaries, activeInvestors]);

  const capTotals = useMemo(
    () => ({
      large: equityCapRows.reduce((s, r) => s + r.large, 0),
      mid: equityCapRows.reduce((s, r) => s + r.mid, 0),
      small: equityCapRows.reduce((s, r) => s + r.small, 0),
      total: equityCapRows.reduce((s, r) => s + r.total, 0),
    }),
    [equityCapRows]
  );

  const catTotals = useMemo(
    () => ({
      debt: schemeRows.reduce((s, r) => s + r.debt, 0),
      equity: schemeRows.reduce((s, r) => s + r.equity, 0),
      globalEquity: schemeRows.reduce((s, r) => s + r.globalEquity, 0),
      gold: schemeRows.reduce((s, r) => s + r.gold, 0),
      other: schemeRows.reduce((s, r) => s + r.other, 0),
      total: grandTotal,
    }),
    [schemeRows, grandTotal]
  );

  const sortedMembers = sortAllocationArray(
    memberData,
    investorSort.col,
    investorSort.dir
  );
  const sortedSubCat = sortAllocationArray(
    subCatData,
    subCatSort.col === "name" ? "name" : "value",
    subCatSort.dir
  );
  const sortedAmc = sortAllocationArray(
    amcData,
    amcSort.col === "name" ? "name" : "value",
    amcSort.dir
  );
  const sortedCat = sortAllocationArray(schemeRows, catSort.col, catSort.dir);
  const sortedCap = sortAllocationArray(
    equityCapRows,
    capSort.col,
    capSort.dir
  );

  const asOfDate = selectedReport
    ? new Date(selectedReport.asOfDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div
      className="space-y-6 max-w-[1400px] mx-auto relative min-h-screen pb-12 selection:bg-teal-500/30"
      onClick={() => investorOpen && setInvestorOpen(false)}
    >
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ── FILTER BAR ── */}
      <AllocationFilterBar
        asOfDate={asOfDate}
        allMembers={allMembers}
        selectedInvestors={selectedInvestors}
        investorOpen={investorOpen}
        onToggleDropdown={(e) => {
          e.stopPropagation();
          setInvestorOpen((o) => !o);
        }}
        onToggleInvestor={toggleInvestor}
        onApply={handleApply}
        isAllSelected={isAllSelected}
        investorLabel={investorLabel}
      />

      {grandTotal === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <p>No portfolio data available for the selected investors.</p>
          {activeInvestors.size !== allMembers.length && (
            <button
              onClick={() => {
                const defaultSet = new Set(allMembers);
                setSelectedInvestors(defaultSet);
                setActiveInvestors(defaultSet);
                updateUrl({ members: null });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
            >
              Reset Investors
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── MAIN: Tables + Pie Chart ── */}
          <AllocationOverviewSection
            sortedMembers={sortedMembers}
            grandTotal={grandTotal}
            investorSort={investorSort}
            onInvestorSort={makeSorter(setInvestorSort)}
            categoryData={categoryData}
          />

          {/* ══ CARD 1: Sub Category & Fund (side by side but separate) ══ */}
          <AllocationSubCategoryAndFundSection
            grandTotal={grandTotal}
            sortedSubCat={sortedSubCat}
            subCatSort={subCatSort}
            onSubCatSort={makeSorter(setSubCatSort)}
            sortedAmc={sortedAmc}
            amcSort={amcSort}
            onAmcSort={makeSorter(setAmcSort)}
          />

          {/* ══ CARD 2: Category (asset class breakdown) ══ */}
          <AllocationCategoryAssetTableCard
            isOpen={categoryOpen}
            onToggle={() => setCategoryOpen((v) => !v)}
            sortedCat={sortedCat}
            catTotals={catTotals}
            catSort={catSort}
            onSort={makeSorter(setCatSort)}
          />

          {/* ══ CARD 3: Equity Cap ══ */}
          <AllocationEquityCapTableCard
            isOpen={equityCapOpen}
            onToggle={() => setEquityCapOpen((v) => !v)}
            sortedCap={sortedCap}
            capTotals={capTotals}
            capSort={capSort}
            onSort={makeSorter(setCapSort)}
          />

          {/* ══ CARD 4: Scheme / Scrip (grouped tree) ══ */}
          <AllocationSchemeGroupedTableCard
            isOpen={schemeScripOpen}
            onToggle={() => setSchemeScripOpen((v) => !v)}
            grandTotal={grandTotal}
            schemeGrouped={schemeGrouped}
          />
        </>
      )}
    </div>
  );
}
