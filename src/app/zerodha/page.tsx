import {
  getZerodhaDashboardData,
  getZerodhaSchemes,
} from "@/lib/zerodhaService";
import { getAllSchemeCategoryRankingsMap } from "@/lib/fundRankingService";
import ZerodhaDashboard from "@/components/zerodha/ZerodhaDashboard";
import { PageProps } from "@/types/zerodha";
import { Suspense } from "react";
import Loading from "@/app/loading";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zerodha Portfolio" };

export default async function ZerodhaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawReportId = params.reportId || params.zerodhaReportId;
  const zerodhaReportId = rawReportId ? parseInt(rawReportId, 10) : undefined;
  const account = params.account || "all";

  const [data, allSchemes, categoryRankingsMap] = await Promise.all([
    getZerodhaDashboardData(zerodhaReportId, account),
    getZerodhaSchemes(account),
    getAllSchemeCategoryRankingsMap(),
  ]);

  return (
    <main className="flex-1 flex flex-col min-h-0 min-w-0 selection:bg-teal-500/30 selection:text-teal-200">
      <Suspense fallback={<Loading />}>
        <ZerodhaDashboard
          data={data}
          allSchemes={allSchemes}
          categoryRankingsMap={categoryRankingsMap}
        />
      </Suspense>
    </main>
  );
}
