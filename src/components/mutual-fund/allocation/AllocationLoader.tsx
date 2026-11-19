import { getDashboardDataAction } from "@/actions/portfolio";
import { getReports, getSchemes } from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import AllocationClient from "@/components/mutual-fund/allocation/AllocationClient";
import type { PageProps } from "@/types/allocation";

export default async function AllocationLoader({ searchParams }: PageProps) {
  const reportsListPromise = getReports();
  const schemesPromise = getSchemes();
  const dataPromise = Promise.all([reportsListPromise, searchParams]).then(
    ([reps, params]) => {
      const reportId = params.reportId
        ? parseInt(params.reportId, 10)
        : undefined;
      return getDashboardDataAction(reportId, reps);
    }
  );

  const [reportsList, allSchemes, data] = await Promise.all([
    reportsListPromise,
    schemesPromise,
    dataPromise,
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Asset Allocation"
        iconName="pie-chart"
        reportsList={reportsList}
        selectedReport={data.selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <AllocationClient
          memberSummaries={data.memberSummaries}
          holdings={data.holdings}
          categoryAllocation={data.categoryAllocation}
          capAllocation={data.capAllocation}
          amcAllocation={data.amcAllocation}
          totals={data.totals}
          selectedReport={data.selectedReport}
        />
      </main>
    </>
  );
}
