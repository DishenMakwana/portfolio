import { Suspense } from "react";
import {
  getValuationData,
  getReports,
  getSchemes,
} from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import ValuationClient from "@/components/mutual-fund/valuation/ValuationClient";

import type { ValuationPageProps } from "@/types/valuation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio Valuation — Family Portfolio" };

export default async function ValuationPage({
  searchParams,
}: ValuationPageProps) {
  const params = await searchParams;
  const targetReportId = params.reportId
    ? parseInt(params.reportId, 10)
    : undefined;

  const reportsListPromise = getReports();
  const valuationDataPromise = reportsListPromise.then((list) =>
    getValuationData(targetReportId, list)
  );

  const [reportsList, allSchemes, valuationData] = await Promise.all([
    reportsListPromise,
    getSchemes(),
    valuationDataPromise,
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
