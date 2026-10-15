"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import GrandPortfolioSummaryCard from "./GrandPortfolioSummaryCard";
import FamilyMembersGrid from "./FamilyMembersGrid";
import type { MembersTabProps } from "@/types/members";

export default function MembersTab({
  memberSummaries,
  totals,
  metricDeltas,
  holdings,
  selectedReport,
}: MembersTabProps) {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [expandedMembers, setExpandedMembers] = useState<
    Record<string, boolean>
  >({});

  const toggleDemat = (name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMembers((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const sortedMemberSummaries = useMemo(() => {
    return [...memberSummaries].sort((a, b) => {
      const xirrA = a.xirr ?? -Infinity;
      const xirrB = b.xirr ?? -Infinity;
      return xirrB - xirrA;
    });
  }, [memberSummaries]);

  const activeHoldings = useMemo(() => {
    return holdings.filter(
      (h) => (h.balanceUnits ?? 0) > 0.0001 && h.currentValue > 0
    );
  }, [holdings]);

  const activeInvested = useMemo(() => {
    return (
      activeHoldings.reduce((acc, h) => acc + (h.purchaseValue || 0), 0) ||
      totals.invested ||
      1
    );
  }, [activeHoldings, totals.invested]);

  const overallCagr =
    totals.cagr !== undefined && totals.cagr !== null
      ? totals.cagr
      : activeHoldings.length > 0
        ? activeHoldings.reduce(
            (acc, h) => acc + (h.cagr || 0) * (h.purchaseValue || 0),
            0
          ) / activeInvested
        : 0;

  const avgHoldingDays =
    activeHoldings.length > 0
      ? Math.round(
          activeHoldings.reduce(
            (acc, h) => acc + (h.holdingDays || 0) * (h.purchaseValue || 0),
            0
          ) / activeInvested
        )
      : 0;

  return (
    <div className="space-y-6">
      <GrandPortfolioSummaryCard
        totals={totals}
        metricDeltas={metricDeltas}
        overallCagr={overallCagr}
        avgHoldingDays={avgHoldingDays}
        selectedReport={selectedReport}
      />
      <FamilyMembersGrid
        memberSummaries={sortedMemberSummaries}
        holdings={holdings}
        reportId={reportId}
        expandedMembers={expandedMembers}
        onToggleDemat={toggleDemat}
      />
    </div>
  );
}
