import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import MembersBarChart from "@/components/shared/MembersBarChart";
import type { MembersTabProps } from "@/types/insights";
import { getMemberShortName } from "@/helpers/formatters";

export default function MembersTab({
  memberCagrs,
  niftyBenchmark,
}: MembersTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
          Member CAGR Leaderboard
        </h2>
        <MembersBarChart
          memberCagrs={memberCagrs}
          niftyBenchmark={niftyBenchmark}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {memberCagrs.map((member, index) => {
          const medal = ["🥇", "🥈", "🥉"][index] ?? null;
          const isTop = index === 0;
          const benchmarkGap = member.cagr - niftyBenchmark;
          const maxCagr = Math.max(member.cagr, niftyBenchmark, 1);
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
                    member.cagr >= 15
                      ? "text-emerald-400"
                      : member.cagr >= niftyBenchmark
                        ? "text-teal-400"
                        : member.cagr >= 10
                          ? "text-amber-400"
                          : "text-rose-400"
                  }`}
                >
                  {member.cagr.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Weighted Return Spread</span>
                  <span
                    className={
                      member.cagr >= niftyBenchmark
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {member.cagr.toFixed(2)}% / {niftyBenchmark.toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (member.cagr / maxCagr) * 90)}%`,
                    }}
                    transition={{ duration: 0.8 }}
                    className={`absolute top-0 bottom-0 left-0 h-full rounded-full bg-gradient-to-r ${
                      isTop
                        ? "from-emerald-500 to-teal-400"
                        : member.cagr >= niftyBenchmark
                          ? "from-blue-500 to-indigo-400"
                          : "from-red-500 to-rose-400"
                    }`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (niftyBenchmark / maxCagr) * 90)}%`,
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
