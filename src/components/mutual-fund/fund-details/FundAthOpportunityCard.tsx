"use client";

import AthOpportunityCard from "@/components/shared/AthOpportunityCard";
import type { FundAthOpportunityCardProps } from "@/types/fund-details";

export default function FundAthOpportunityCard({
  athMetrics,
  schemeName,
  isStock,
}: FundAthOpportunityCardProps) {
  return (
    <AthOpportunityCard
      athNav={athMetrics.athNav}
      athDateFormatted={athMetrics.athDateFormatted}
      currentNav={athMetrics.currentNav}
      correctionPct={athMetrics.correctionPct}
      daysSinceAth={athMetrics.daysSinceAth}
      isLumpsumOpportunity={athMetrics.isLumpsumOpportunity}
      schemeName={schemeName}
      isStock={isStock}
    />
  );
}
