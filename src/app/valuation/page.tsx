import { Suspense } from "react";
import {
  getValuationData,
  getReports,
  getSchemes,
} from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import ValuationClient from "@/components/mutual-fund/valuation/ValuationClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio Valuation — Family Portfolio" };

interface PageProps {
  searchParams: Promise<{
    reportId?: string;
  }>;
}

export default async function ValuationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const targetReportId = params.reportId
    ? parseInt(params.reportId, 10)
    : undefined;

  const [reportsList, allSchemes, valuationData] = await Promise.all([
    getReports(),
    getSchemes(),
    getValuationData(targetReportId),
  ]);

  const selectedReportId = targetReportId || reportsList[0]?.id;
  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport =
    reportsList.find((r) => r.id === selectedReportId) ||
    reportsList[0] ||
    null;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Portfolio Valuation"
        iconName="file-spreadsheet"
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30">
        <Suspense fallback={null}>
          <ValuationClient data={valuationData} />
        </Suspense>
      </main>
    </>
  );
}
