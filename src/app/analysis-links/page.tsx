import { Suspense } from "react";
import {
  getAnalysisLinks,
  calculateAnalysisLinksStats,
} from "@/lib/analysisLinksService";
import AnalysisLinksClient from "@/components/analysis-links/AnalysisLinksClient";
import type { AnalysisLinksPageProps } from "@/types/analysisLinks";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Market Analysis Links | Portfolio",
  description:
    "Curated collection of market research tools, stock screeners, and analysis links",
};

export default async function AnalysisLinksPage({}: AnalysisLinksPageProps) {
  const links = await getAnalysisLinks();
  const stats = calculateAnalysisLinksStats(links);

  return (
    <Suspense fallback={null}>
      <AnalysisLinksClient initialLinks={links} stats={stats} />
    </Suspense>
  );
}
