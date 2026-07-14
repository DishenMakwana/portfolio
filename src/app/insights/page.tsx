import { getInsightsData } from "@/lib/insightsService";
import InsightsDashboard from "@/components/InsightsDashboard";
import { Lightbulb } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investment Insights" };

export default async function InsightsPage() {
  const data = await getInsightsData();
  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-teal-400" />
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
            Investment Insights
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[300px] text-slate-400 font-medium">
              Loading dashboard...
            </div>
          }
        >
          <InsightsDashboard data={data} />
        </Suspense>
      </main>
    </>
  );
}
