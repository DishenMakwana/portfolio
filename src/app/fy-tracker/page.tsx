import { getFyTrackerData } from "@/lib/insightsService";
import FyTrackerClient from "@/components/mutual-fund/fy-tracker/FyTrackerClient";
import { CalendarRange } from "lucide-react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "FY Investment Tracker" };

export default async function FyTrackerPage() {
  const data = await getFyTrackerData();
  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-teal-400" />
          <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
            FY Investment Tracker
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[300px] text-slate-400 font-medium">
              Loading FY Investment Tracker...
            </div>
          }
        >
          <FyTrackerClient initialData={data} />
        </Suspense>
      </main>
    </>
  );
}
