import { getMsflDashboardData, getMsflSchemes } from "@/lib/msflService";
import MsflDashboardClient from "@/components/MsflDashboardClient";
import { Briefcase } from "lucide-react";
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
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-teal-400" />
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
            MSFL Stocks Portfolio
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <MsflDashboardClient
          msflData={msflData}
          allMsflSchemes={allMsflSchemes}
        />
      </main>
    </>
  );
}
