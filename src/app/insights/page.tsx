import { getInsightsData } from "@/lib/insightsService";
import InsightsDashboard from "@/components/mutual-fund/InsightsDashboard";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investment Insights" };

export default async function InsightsPage() {
  const data = await getInsightsData();
  return (
    <main className="flex-1 flex flex-col min-h-0 min-w-0 selection:bg-teal-500/30 selection:text-teal-200">
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
  );
}
