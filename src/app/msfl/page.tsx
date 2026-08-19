import { getMsflDashboardData, getMsflSchemes } from "@/lib/msflService";
import MsflDashboardClient from "@/components/msfl/MsflDashboardClient";
import HeaderClient from "@/components/shared/HeaderClient";
import { PageProps } from "@/types/msfl";

export const dynamic = "force-dynamic";
export const metadata = { title: "MSFL Stocks Portfolio" };

export default async function MsflPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const msflReportId = params.msflReportId
    ? parseInt(params.msflReportId, 10)
    : undefined;

  const [msflData, allMsflSchemes] = await Promise.all([
    getMsflDashboardData(msflReportId),
    getMsflSchemes(),
  ]);

  return (
    <>
      <HeaderClient title="MSFL Stocks Portfolio" iconName="briefcase" />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <MsflDashboardClient
          msflData={msflData}
          allMsflSchemes={allMsflSchemes}
        />
      </main>
    </>
  );
}
