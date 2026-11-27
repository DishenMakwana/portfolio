import { getDashboardDataAction } from "@/actions/portfolio";
import { getReports, getSchemes } from "@/lib/portfolioService";
import { getAllSchemeCategoryRankingsMap } from "@/lib/fundRankingService";
import HoldingsTab from "@/components/mutual-fund/holdings/HoldingsTab";
import HeaderClient from "@/components/shared/HeaderClient";
import type { PageProps } from "@/types/holdings";

export default async function HoldingsLoader({ searchParams }: PageProps) {
  const reportsListPromise = getReports();
  const schemesPromise = getSchemes();
  const rankingsPromise = getAllSchemeCategoryRankingsMap();
  const dataPromise = Promise.all([reportsListPromise, searchParams]).then(
    ([reps, params]) => {
      const reportId = params.reportId
        ? parseInt(params.reportId, 10)
        : undefined;
      return getDashboardDataAction(reportId, reps);
    }
  );

  const [reportsList, allSchemes, categoryRankingsMap, data, params] =
    await Promise.all([
      reportsListPromise,
      schemesPromise,
      rankingsPromise,
      dataPromise,
      searchParams,
    ]);
  const initialMember = params.member || "All";
  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Holdings"
        iconName="table"
        reportsList={reportsList}
        selectedReport={data.selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 flex flex-col overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">Holdings</h1>
          <p className="text-sm text-slate-400 mt-1">
            All fund positions with XIRR, Alpha, and performance metrics
          </p>
        </div>
        <HoldingsTab
          holdings={data.holdings}
          memberSummaries={data.memberSummaries}
          initialMember={initialMember}
          categoryRankingsMap={categoryRankingsMap}
        />
      </main>
    </>
  );
}
