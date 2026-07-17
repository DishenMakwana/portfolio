import { getDashboardDataAction } from "@/actions/portfolio";
import { getSchemes } from "@/lib/portfolioService";
import MembersTab from "@/components/mutual-fund/members/MembersTab";
import HeaderClient from "@/components/shared/HeaderClient";
import { Suspense } from "react";
import { PageProps } from "@/types/members";

export const dynamic = "force-dynamic";
export const metadata = { title: "Family Portfolio" };

export default async function FamilyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;

  const data = await getDashboardDataAction(reportId);
  const allSchemes = await getSchemes();
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
          <h1 className="text-xl font-bold text-slate-100">Family Portfolio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Per-member performance and allocation breakdown
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-96 bg-slate-900/10 animate-pulse rounded-xl" />
          }
        >
          <MembersTab
            memberSummaries={data.memberSummaries}
            totals={data.totals}
            metricDeltas={data.metricDeltas}
            holdings={data.holdings}
            selectedReport={data.selectedReport}
          />
        </Suspense>
      </main>
    </>
  );
}
