import { Suspense } from "react";
import { getReports, getSchemes } from "@/lib/portfolioService";
import { getNiftyAnalysisData } from "@/lib/niftyAnalysisService";
import HeaderClient from "@/components/shared/HeaderClient";
import NiftyAnalysisClient from "@/components/mutual-fund/nifty-analysis/NiftyAnalysisClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Nifty Trajectory & Transaction Insights — Family Portfolio",
};

interface PageProps {
  searchParams: Promise<{
    reportId?: string;
  }>;
}

export default async function NiftyAnalysisPage({ searchParams }: PageProps) {
  const [params, reportsList, allSchemes] = await Promise.all([
    searchParams,
    getReports(),
    getSchemes(),
  ]);

  const selectedReportId = params.reportId
    ? parseInt(params.reportId, 10)
    : reportsList[0]?.id;

  const [niftyData] = await Promise.all([
    getNiftyAnalysisData(selectedReportId),
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport =
    reportsList.find((r) => r.id === selectedReportId) ||
    reportsList[0] ||
    null;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Nifty Trajectory"
        iconName="compass"
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Nifty Trajectory & Transaction Analysis</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Analyze portfolio purchase and redemption transactions against the
            NIFTY 50 historical timeline to evaluate entry/exit timing, lumpsum
            allocations, and market performance.
          </p>
        </div>
        <Suspense fallback={null}>
          <NiftyAnalysisClient data={niftyData} />
        </Suspense>
      </main>
    </>
  );
}
