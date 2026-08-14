"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import MembersBarChart from "@/components/shared/MembersBarChart";
import type { MembersTabProps, MemberCagrPoint } from "@/types/insights";
import { getMemberShortName } from "@/helpers/formatters";

type MetricFilter = "cagr" | "xirr" | "absReturn";

export default function MembersTab({
  memberCagrs,
  niftyBenchmark,
  benchmarkXirr,
}: MembersTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialMetric = (searchParams.get("metric") as MetricFilter) || "cagr";
  const [metricFilter, setMetricFilter] = useState<MetricFilter>(initialMetric);

  useEffect(() => {
    const m = searchParams.get("metric") as MetricFilter;
    if (m && ["cagr", "xirr", "absReturn"].includes(m)) {
      setMetricFilter(m);
    }
  }, [searchParams]);

  const handleMetricChange = (metric: MetricFilter) => {
    setMetricFilter(metric);
    const current = new URLSearchParams(searchParams.toString());
    if (metric === "cagr") {
      current.delete("metric");
    } else {
      current.set("metric", metric);
    }
    const query = current.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const getValue = (m: MemberCagrPoint) => {
    if (metricFilter === "xirr") return m.xirr ?? m.cagr;
    if (metricFilter === "absReturn") return m.absReturn ?? m.cagr;
    return m.cagr;
  };

  // CAGR → Nifty 3Y CAGR; XIRR / Abs Return → all-time simulated Nifty XIRR
  const activeBenchmark =
    metricFilter === "cagr" ? niftyBenchmark : benchmarkXirr;

  const activeBenchmarkLabel =
    metricFilter === "cagr"
      ? `Nifty CAGR (since inception) ${niftyBenchmark.toFixed(2)}%`
      : `Nifty All-Time XIRR ${benchmarkXirr.toFixed(2)}%`;

  const sortedMembers = useMemo(() => {
    return [...memberCagrs].sort((a, b) => getValue(b) - getValue(a));
  }, [memberCagrs, metricFilter]);

  const metricTitle =
    metricFilter === "cagr"
      ? "Member CAGR Leaderboard"
      : metricFilter === "xirr"
        ? "Member XIRR Leaderboard"
        : "Member Abs Return Leaderboard";

  const metricLabel =
    metricFilter === "cagr"
      ? "CAGR"
      : metricFilter === "xirr"
        ? "XIRR"
        : "Abs Return";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            {metricTitle}
          </h2>

          {/* Metric Toggle Filter */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-1 flex items-center gap-1">
            {[
              { key: "cagr", label: "CAGR" },
              { key: "xirr", label: "XIRR" },
              { key: "absReturn", label: "Abs Return" },
            ].map((item) => {
              const isActive = metricFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMetricChange(item.key as MetricFilter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                    isActive
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.15)]"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 mb-3">
          Benchmark:{" "}
          <span className="text-amber-400 font-semibold">
            {activeBenchmarkLabel}
          </span>
        </p>
        <MembersBarChart
          memberCagrs={sortedMembers}
          niftyBenchmark={activeBenchmark}
          metricKey={metricFilter}
          metricLabel={metricLabel}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMembers.map((member, index) => {
          const medal = ["🥇", "🥈", "🥉"][index] ?? null;
          const isTop = index === 0;
          const val = getValue(member);
          const benchmarkGap = val - activeBenchmark;
          const maxVal = Math.max(val, activeBenchmark, 1);
          return (
            <motion.div
              key={member.memberName}
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`rounded-2xl border p-4 backdrop-blur-md space-y-3 relative overflow-hidden ${
                isTop
                  ? "border-teal-500/25 bg-slate-900/75 shadow-[0_0_20px_rgba(20,184,166,0.06)]"
                  : "border-slate-800/80 bg-slate-900/70"
              }`}
            >
              {isTop && (
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-100 leading-tight truncate">
                    {medal} {getMemberShortName(member.memberName)}
                  </p>
                  <p className="text-xs text-slate-500 leading-normal break-words">
                    {member.memberName}
                  </p>
                </div>
                <span
                  className={`text-lg font-extrabold ${
                    val >= 15
                      ? "text-emerald-400"
                      : val >= activeBenchmark
                        ? "text-teal-400"
                        : val >= 10
                          ? "text-amber-400"
                          : "text-rose-400"
                  }`}
                >
                  {val.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>{metricLabel} Spread</span>
                  <span
                    className={
                      val >= activeBenchmark
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {val.toFixed(2)}% / {activeBenchmark.toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.max(0, (val / maxVal) * 90))}%`,
                    }}
                    transition={{ duration: 0.8 }}
                    className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r ${
                      isTop
                        ? "from-emerald-500 to-teal-400"
                        : val >= activeBenchmark
                          ? "from-blue-500 to-indigo-400"
                          : "from-red-500 to-rose-400"
                    }`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (activeBenchmark / maxVal) * 90)}%`,
                    }}
                    transition={{ duration: 0.8 }}
                    className="absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 opacity-80"
                  />
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>MF Portfolio</span>
                  <span>Nifty Index Line</span>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                {benchmarkGap >= 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 size={11} /> Above Nifty by{" "}
                    {benchmarkGap.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1 font-medium">
                    <AlertTriangle size={11} /> Below Nifty by{" "}
                    {Math.abs(benchmarkGap).toFixed(2)}%
                  </span>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
