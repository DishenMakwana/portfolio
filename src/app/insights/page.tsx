import { Suspense } from "react";
import { getInsightsData, getFyTrackerData } from "@/lib/insightsService";
import { getNiftyAnalysisData } from "@/lib/niftyAnalysisService";
import { getReports } from "@/lib/portfolioService";
import InsightsDashboard from "@/components/mutual-fund/InsightsDashboard";
import type { InsightsPageProps } from "@/types/insights";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investment Insights" };

export default async function InsightsPage({
  searchParams,
}: InsightsPageProps) {
  const params = await searchParams;
  const targetReportId = params?.reportId
    ? parseInt(params.reportId, 10)
    : undefined;

  // Execute independent queries in parallel using Promise.all
  const reportsPromise = getReports();
  const insightsPromise = getInsightsData();
  const fyTrackerPromise = getFyTrackerData(params?.fy);
  const niftyPromise = reportsPromise.then((reportsList) =>
    getNiftyAnalysisData(targetReportId, reportsList)
  );

  const [insightsData, niftyData, fyTrackerData] = await Promise.all([
    insightsPromise,
    niftyPromise,
    fyTrackerPromise,
  ]);

  return (
    <main className="flex-1 flex flex-col min-h-0 min-w-0 selection:bg-teal-500/30 selection:text-teal-200">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[300px] text-slate-400 font-medium">
            Loading dashboard...
          </div>
        }
      >
        <InsightsDashboard
          data={insightsData}
          niftyData={niftyData}
          fyTrackerData={fyTrackerData}
        />
      </Suspense>
    </main>
  );
}
