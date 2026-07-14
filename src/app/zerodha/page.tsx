import {
  getZerodhaDashboardData,
  getZerodhaSchemes,
} from "@/lib/zerodhaService";
import ZerodhaDashboard from "@/components/ZerodhaDashboard";
import { Briefcase } from "lucide-react";

import { PageProps } from "@/types/zerodha";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zerodha Portfolio" };

export default async function ZerodhaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const zerodhaReportId = params.zerodhaReportId
    ? parseInt(params.zerodhaReportId, 10)
    : undefined;

  const [data, allSchemes] = await Promise.all([
    getZerodhaDashboardData(zerodhaReportId),
    getZerodhaSchemes(),
  ]);

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-teal-400" />
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
            Zerodha Portfolio
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <ZerodhaDashboard data={data} allSchemes={allSchemes} />
      </main>
    </>
  );
}
