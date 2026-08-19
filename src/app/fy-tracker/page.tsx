import { getFyTrackerData } from "@/lib/insightsService";
import FyTrackerClient from "@/components/mutual-fund/fy-tracker/FyTrackerClient";
import HeaderClient from "@/components/shared/HeaderClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "FY Investment Tracker" };

export default async function FyTrackerPage() {
  const data = await getFyTrackerData();
  return (
    <>
      <HeaderClient
        title="Family Portfolio - FY Investment Tracker"
        iconName="calendar-range"
      />
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
