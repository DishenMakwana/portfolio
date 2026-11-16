import {
  getAnalysisLinks,
  calculateAnalysisLinksStats,
} from "@/lib/analysisLinksService";
import AnalysisLinksClient from "@/components/analysis-links/AnalysisLinksClient";

export default async function AnalysisLinksLoader() {
  const links = await getAnalysisLinks();
  const stats = calculateAnalysisLinksStats(links);

  return <AnalysisLinksClient initialLinks={links} stats={stats} />;
}
