import { getDashboardDataAction } from "@/actions/portfolio";
import { getSchemes } from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import AllocationClient from "@/components/mutual-fund/allocation/AllocationClient";
import { PageProps } from "@/types/allocation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asset Allocation — Family Portfolio" };

export default async function AllocationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;

  const [data, allSchemes] = await Promise.all([
    getDashboardDataAction(reportId),
    getSchemes(),
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;

  return (
    <>
      <HeaderClient
        reportsList={data.reportsList}
        selectedReport={data.selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30">
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
