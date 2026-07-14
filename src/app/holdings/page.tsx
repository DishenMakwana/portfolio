import { getDashboardDataAction } from "@/actions/portfolio";
import { getSchemes } from "@/lib/portfolioService";
import HoldingsTab from "@/components/HoldingsTab";
import HeaderClient from "@/components/HeaderClient";
import { PageProps } from "@/types/holdings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Holdings" };

export default async function HoldingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;
  const initialMember = params.member || "All";

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
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
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
        />
      </main>
    </>
  );
}
