"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { trackFilterLatency } from "@/helpers/performance";
import { calculateFilteredSummaryTotals } from "@/helpers/portfolioSummary";
import PortfolioSummaryHeroCards from "@/components/mutual-fund/summary/PortfolioSummaryHeroCards";
import PortfolioSummaryFilters from "@/components/mutual-fund/summary/PortfolioSummaryFilters";
import PortfolioSummaryTable from "@/components/mutual-fund/summary/PortfolioSummaryTable";
import type { PortfolioSummaryClientProps } from "@/types/summary";

export default function PortfolioSummaryClient({
  data,
}: PortfolioSummaryClientProps) {
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

  // Debounced search query update in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQ = searchParams.get("q") || "";
      if (currentUrlQ !== searchQuery) {
        updateUrl({ q: searchQuery });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMemberChange = (member: string) => {
    trackFilterLatency("Mutual Funds - Portfolio Summary", "Member", member);
    setSelectedMember(member);
    updateUrl({ member });
  };

  const toggleFolio = (key: string) => {
    setExpandedFolios((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filtered members and hierarchy based on search query and selected member
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

            const totalPurchase = filteredHoldings.reduce(
              (acc, h) => acc + h.purchaseAmount,
              0
            );
            const totalSwitchIn = filteredHoldings.reduce(
              (acc, h) => acc + h.switchInAmount,
              0
            );
            const totalRedemption = filteredHoldings.reduce(
              (acc, h) => acc + h.redemptionAmount,
              0
            );
            const totalSwitchOut = filteredHoldings.reduce(
              (acc, h) => acc + h.switchOutAmount,
              0
            );
            const totalCurrentValue = filteredHoldings.reduce(
              (acc, h) => acc + h.currentValue,
              0
            );
            const totalRealizedGain = filteredHoldings.reduce(
              (acc, h) => acc + h.realizedGain,
              0
            );
            const totalUnrealizedGain = filteredHoldings.reduce(
              (acc, h) => acc + h.unrealizedGain,
              0
            );
            const totalGain = totalRealizedGain + totalUnrealizedGain;

            const costBasis = filteredHoldings.reduce(
              (acc, h) =>
                acc +
                (h.purchaseAmount > 0 ? h.purchaseAmount : h.switchInAmount),
              0
            );
            const weightedXirrNum = filteredHoldings.reduce((acc, h) => {
              const cost =
                h.purchaseAmount > 0 ? h.purchaseAmount : h.switchInAmount;
              return acc + h.xirr * (cost > 0 ? cost : 1);
            }, 0);
            const xirrPct =
              costBasis > 0
                ? Math.round((weightedXirrNum / costBasis) * 100) / 100
                : 0;

            const catCost = totalPurchase + totalSwitchIn;
            const absReturnPct =
              catCost > 0
                ? Math.round((totalGain / catCost) * 100 * 100) / 100
                : 0;

            return {
              ...cat,
              holdings: filteredHoldings,
              totalPurchase,
              totalSwitchIn,
              totalRedemption,
              totalSwitchOut,
              totalCurrentValue,
              totalRealizedGain,
              totalUnrealizedGain,
              totalGain,
              xirrPct,
              absReturnPct,
            };
          })
          .filter((cat) => cat.holdings.length > 0);

        const mPurchase = filteredCategories.reduce(
          (acc, c) => acc + c.totalPurchase,
          0
        );
        const mSwitchIn = filteredCategories.reduce(
          (acc, c) => acc + c.totalSwitchIn,
          0
        );
        const mRedemption = filteredCategories.reduce(
          (acc, c) => acc + c.totalRedemption,
          0
        );
        const mSwitchOut = filteredCategories.reduce(
          (acc, c) => acc + c.totalSwitchOut,
          0
        );
        const mCurrentValue = filteredCategories.reduce(
          (acc, c) => acc + c.totalCurrentValue,
          0
        );
        const mRealizedGain = filteredCategories.reduce(
          (acc, c) => acc + c.totalRealizedGain,
          0
        );
        const mUnrealizedGain = filteredCategories.reduce(
          (acc, c) => acc + c.totalUnrealizedGain,
          0
        );
        const mTotalGain = mRealizedGain + mUnrealizedGain;

        const mCostBasis = filteredCategories.reduce(
          (acc, c) =>
            acc +
            c.holdings.reduce(
              (hAcc, h) =>
                hAcc +
                (h.purchaseAmount > 0 ? h.purchaseAmount : h.switchInAmount),
              0
            ),
          0
        );
        const mWeightedXirrNum = filteredCategories.reduce(
          (acc, c) =>
            acc +
            c.holdings.reduce((hAcc, h) => {
              const cost =
                h.purchaseAmount > 0 ? h.purchaseAmount : h.switchInAmount;
              return hAcc + h.xirr * (cost > 0 ? cost : 1);
            }, 0),
          0
        );
        const mXirrPct =
          mCostBasis > 0
            ? Math.round((mWeightedXirrNum / mCostBasis) * 100) / 100
            : 0;

        const mTotalCost = mPurchase + mSwitchIn;
        const mAbsReturnPct =
          mTotalCost > 0
            ? Math.round((mTotalGain / mTotalCost) * 100 * 100) / 100
            : 0;

        return {
          ...m,
          categories: filteredCategories,
          totalPurchase: mPurchase,
          totalSwitchIn: mSwitchIn,
          totalRedemption: mRedemption,
          totalSwitchOut: mSwitchOut,
          totalCurrentValue: mCurrentValue,
          totalRealizedGain: mRealizedGain,
          totalUnrealizedGain: mUnrealizedGain,
          totalGain: mTotalGain,
          xirrPct: mXirrPct,
          absReturnPct: mAbsReturnPct,
        };
      })
      .filter((m) => m.categories.length > 0);
  }, [data.members, searchQuery, selectedMember]);

  // Overall KPI Card Summary
  const filteredSummary = useMemo(() => {
    const isFiltered = Boolean(searchQuery.trim() || selectedMember !== "all");
    return calculateFilteredSummaryTotals(
      filteredData,
      data.summary,
      data.asOfDate,
      isFiltered
    );
  }, [filteredData, data.summary, data.asOfDate, searchQuery, selectedMember]);

  const allMembersList = useMemo(() => {
    return data.members
      .map((m) => m.memberName)
      .sort((a, b) => a.localeCompare(b));
  }, [data.members]);

  const handleClearFilters = () => {
    trackFilterLatency(
      "Mutual Funds - Portfolio Summary",
      "Clear Filters",
      "all"
    );
    setSearchQuery("");
    setSelectedMember("all");
    updateUrl({ q: null, member: null });
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedMember !== "all"
  );

  return (
    <div className="space-y-4 max-w-full pb-16">
      {/* ── TOP KPI CARDS ── */}
      <PortfolioSummaryHeroCards summary={filteredSummary} />

      {/* ── Search + Applicant Filters card ── */}
      <PortfolioSummaryFilters
        searchQuery={searchQuery}
        selectedMember={selectedMember}
        membersList={allMembersList}
        onSearchChange={(val) => {
          setSearchQuery(val);
          updateUrl({ q: val || null });
        }}
        onMemberChange={handleMemberChange}
      />

      {/* ── MAIN SUMMARY TABLE ── */}
      <PortfolioSummaryTable
        filteredData={filteredData}
        summary={filteredSummary}
        expandedFolios={expandedFolios}
        hasActiveFilters={hasActiveFilters}
        onToggleFolio={toggleFolio}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
