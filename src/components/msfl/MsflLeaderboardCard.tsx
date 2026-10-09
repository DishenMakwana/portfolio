"use client";

import { BarChart3 } from "lucide-react";
import MsflLeaderboardChart from "@/components/msfl/MsflLeaderboardChart";
import type { MsflLeaderboardCardProps } from "@/types/msfl";

export default function MsflLeaderboardCard({
  cagrHoldings,
  benchmark,
}: MsflLeaderboardCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-xl">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <BarChart3 size={15} className="text-teal-400" />
        MSFL Stock CAGR Leaderboard
      </h3>
      {cagrHoldings.length > 0 ? (
        <MsflLeaderboardChart
          mfHoldings={cagrHoldings.slice(0, 10)}
          niftyBenchmark={benchmark}
        />
      ) : (
        <div className="py-12 text-center text-xs text-slate-500">
          No MSFL stocks with CAGR history found in this snapshot.
        </div>
      )}
    </div>
  );
}
