"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { trackFilterLatency } from "@/helpers/performance";
import { useDebounce } from "@/helpers/useDebounce";
import ValuationKpiCards from "@/components/mutual-fund/valuation/ValuationKpiCards";
import ValuationFilters from "@/components/mutual-fund/valuation/ValuationFilters";
import ValuationTable from "@/components/mutual-fund/valuation/ValuationTable";
import type { ValuationClientProps } from "@/types/valuation";

export default function ValuationClient({ data }: ValuationClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const initialSearch = searchParams.get("q") || "";
  const initialMember = searchParams.get("member") || "all";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedMember, setSelectedMember] = useState<string>(initialMember);
  const [expandedFolios, setExpandedFolios] = useState<Record<string, boolean>>(
    {}
  );

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (
        value === null ||
        value === "" ||
        value === "all" ||
        value === "All"
      ) {
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
  };

  // Synchronize state when URL query params change (e.g. Back/Forward browser navigation)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const member = searchParams.get("member") || "all";
    setSearchQuery(q);
    setSelectedMember(member);
  }, [searchParams]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Debounced search query update in URL
  useEffect(() => {
    const currentUrlQ = searchParams.get("q") || "";
    if (currentUrlQ !== debouncedSearchQuery) {
      updateUrl({ q: debouncedSearchQuery });
    }
  }, [debouncedSearchQuery]);

  const handleMemberChange = (member: string) => {
    trackFilterLatency("Mutual Funds - Valuation", "Member", member);
    setSelectedMember(member);
    updateUrl({ member });
  };

  const toggleFolio = (key: string) => {
    setExpandedFolios((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filtered members and hierarchy
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return data.members
      .filter((m) => {
        if (selectedMember !== "all" && m.memberName !== selectedMember) {
          return false;
        }
        return true;
      })
      .map((m) => {
        const memberMatchesQuery =
          !q ||
          m.memberName.toLowerCase().includes(q) ||
          (m.memberPan && m.memberPan.toLowerCase().includes(q));

        const filteredCategories = m.categories
          .map((cat) => {
            const filteredHoldings = cat.holdings.filter((h) => {
              if (memberMatchesQuery) return true;
              return (
                h.schemeName.toLowerCase().includes(q) ||
                h.folioNo.toLowerCase().includes(q)
              );
            });

            const totalPurchaseValue = filteredHoldings.reduce(
              (acc, h) => acc + h.purchaseValue,
              0
            );
            const totalCurrentValue = filteredHoldings.reduce(
              (acc, h) => acc + h.currentValue,
              0
            );
            const totalGain = totalCurrentValue - totalPurchaseValue;
            const weightedHoldingDaysNum = filteredHoldings.reduce(
              (acc, h) => acc + h.holdingDays * h.purchaseValue,
              0
            );

            const absReturnPct =
              totalPurchaseValue > 0
                ? (totalGain / totalPurchaseValue) * 100
                : 0;
            const weightedHoldingDays =
              totalPurchaseValue > 0
                ? Math.round(weightedHoldingDaysNum / totalPurchaseValue)
                : 0;

            let cagrPct = 0;
            if (
              weightedHoldingDays > 0 &&
              totalPurchaseValue > 0 &&
              totalCurrentValue > 0
            ) {
              if (weightedHoldingDays <= 365) {
                cagrPct = (absReturnPct * 365) / weightedHoldingDays;
              } else {
                cagrPct =
                  (Math.pow(
                    totalCurrentValue / totalPurchaseValue,
                    365 / weightedHoldingDays
                  ) -
                    1) *
                  100;
              }
            }

            const catXirrPct =
              totalPurchaseValue > 0
                ? filteredHoldings.reduce(
                    (acc, h) => acc + h.xirr * h.purchaseValue,
                    0
                  ) / totalPurchaseValue
                : 0;

            return {
              ...cat,
              holdings: filteredHoldings,
              totalPurchaseValue,
              totalCurrentValue,
              totalGain,
              weightedHoldingDays,
              absReturnPct,
              cagrPct,
              xirrPct: catXirrPct,
            };
          })
          .filter((cat) => cat.holdings.length > 0);

        const mPurchaseValue = filteredCategories.reduce(
          (acc, c) => acc + c.totalPurchaseValue,
          0
        );
        const mCurrentValue = filteredCategories.reduce(
          (acc, c) => acc + c.totalCurrentValue,
          0
        );
        const mGain = mCurrentValue - mPurchaseValue;
        const mWeightedHoldingDaysNum = filteredCategories.reduce(
          (acc, c) => acc + c.weightedHoldingDays * c.totalPurchaseValue,
          0
        );

        const mAbsReturnPct =
          mPurchaseValue > 0 ? (mGain / mPurchaseValue) * 100 : 0;
        const mWeightedHoldingDays =
          mPurchaseValue > 0
            ? Math.round(mWeightedHoldingDaysNum / mPurchaseValue)
            : 0;

        let mCagrPct = 0;
        if (
          mWeightedHoldingDays > 0 &&
          mPurchaseValue > 0 &&
          mCurrentValue > 0
        ) {
          if (mWeightedHoldingDays <= 365) {
            mCagrPct = (mAbsReturnPct * 365) / mWeightedHoldingDays;
          } else {
            mCagrPct =
              (Math.pow(
                mCurrentValue / mPurchaseValue,
                365 / mWeightedHoldingDays
              ) -
                1) *
              100;
          }
        }

        const mXirrPct =
          mPurchaseValue > 0
            ? filteredCategories.reduce(
                (acc, c) => acc + c.xirrPct * c.totalPurchaseValue,
                0
              ) / mPurchaseValue
            : 0;

        return {
          ...m,
          categories: filteredCategories,
          totalPurchaseValue: mPurchaseValue,
          totalCurrentValue: mCurrentValue,
          totalGain: mGain,
          weightedHoldingDays: mWeightedHoldingDays,
          absReturnPct: mAbsReturnPct,
          cagrPct: mCagrPct,
          xirrPct: mXirrPct,
        };
      })
      .filter((m) => m.categories.length > 0);
  }, [data.members, searchQuery, selectedMember]);

  // Overall Filtered Summary
  const filteredSummary = useMemo(() => {
    let totalPurchase = 0;
    let totalCurrent = 0;
    let weightedDaysNum = 0;
    let weightedXirrNum = 0;
    let folioCount = 0;

    for (const m of filteredData) {
      for (const cat of m.categories) {
        for (const h of cat.holdings) {
          totalPurchase += h.purchaseValue;
          totalCurrent += h.currentValue;
          weightedDaysNum += h.holdingDays * h.purchaseValue;
          weightedXirrNum += h.xirr * h.purchaseValue;
          folioCount += 1;
        }
      }
    }

    const totalGain = totalCurrent - totalPurchase;
    const absReturnPct =
      totalPurchase > 0 ? (totalGain / totalPurchase) * 100 : 0;
    const isFiltered =
      searchQuery.trim().length > 0 || selectedMember !== "all";

    const weightedHoldingDays =
      totalPurchase > 0 ? Math.round(weightedDaysNum / totalPurchase) : 0;

    let cagrPct = 0;
    if (weightedHoldingDays > 0 && totalPurchase > 0 && totalCurrent > 0) {
      if (weightedHoldingDays <= 365) {
        cagrPct = (absReturnPct * 365) / weightedHoldingDays;
      } else {
        cagrPct =
          (Math.pow(totalCurrent / totalPurchase, 365 / weightedHoldingDays) -
            1) *
          100;
      }
    }

    // Use server-calculated true cash flow XIRR for accurate portfolio / member XIRR
    let resolvedXirrPct = data.summary.xirrPct;
    if (isFiltered) {
      if (selectedMember !== "all" && !searchQuery.trim()) {
        const mem = data.members.find((m) => m.memberName === selectedMember);
        resolvedXirrPct = mem ? mem.xirrPct : 0;
      } else {
        resolvedXirrPct =
          totalPurchase > 0 ? weightedXirrNum / totalPurchase : 0;
      }
    }

    return {
      totalPurchaseValue: totalPurchase,
      totalCurrentValue: totalCurrent,
      totalGain,
      absReturnPct,
      weightedHoldingDays,
      cagrPct,
      xirrPct: resolvedXirrPct,
      folioCount,
    };
  }, [
    filteredData,
    data.summary.xirrPct,
    data.members,
    searchQuery,
    selectedMember,
  ]);

  const allMembersList = useMemo(() => {
    return data.members
      .map((m) => m.memberName)
      .sort((a, b) => a.localeCompare(b));
  }, [data.members]);

  const handleResetFilters = () => {
    trackFilterLatency("Mutual Funds - Valuation", "Reset Filters", "all");
    setSearchQuery("");
    setSelectedMember("all");
    updateUrl({ q: null, member: null });
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedMember !== "all"
  );

  return (
    <div className="space-y-4 max-w-full pb-16">
      {/* ── TOP CONTROLS & KPI CARDS (Overview Design) ── */}
      <ValuationKpiCards summary={filteredSummary} asOfDate={data.asOfDate} />

      {/* ── Search + Applicant Filters card ── */}
      <ValuationFilters
        searchQuery={searchQuery}
        selectedMember={selectedMember}
        membersList={allMembersList}
        onSearchChange={(val) => {
          setSearchQuery(val);
          updateUrl({ q: val || null });
        }}
        onMemberChange={handleMemberChange}
      />

      {/* ── MAIN VALUATION TABLE ── */}
      <ValuationTable
        filteredData={filteredData}
        summary={filteredSummary}
        expandedFolios={expandedFolios}
        hasActiveFilters={hasActiveFilters}
        onToggleFolio={toggleFolio}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
