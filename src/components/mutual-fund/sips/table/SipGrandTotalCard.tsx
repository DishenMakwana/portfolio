import { formatCurrency } from "@/helpers/formatters";
import type { SipGrandTotalCardProps } from "@/types/sips";

export default function SipGrandTotalCard({
  activeSips,
  membersCount,
  monthCols,
  grandMonthlyTotals,
  totalMonthly,
}: SipGrandTotalCardProps) {
  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-teal-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="text-sm font-bold text-slate-300">
          Family Grand Total — {activeSips} active SIPs across {membersCount}{" "}
          investors
        </div>
        <div className="flex items-center gap-6">
          {monthCols.map((col) => {
            const colTotal = grandMonthlyTotals[col] ?? 0;
            return (
              <div key={col} className="text-center">
                <div className="text-[11px] text-slate-500 font-medium">
                  {col}
                </div>
                <div
                  className={`text-sm font-bold ${colTotal > 0 ? "text-teal-400" : "text-slate-600"}`}
                >
                  {colTotal > 0 ? formatCurrency(colTotal) : "—"}
                </div>
              </div>
            );
          })}
          <div className="text-center border-l border-slate-700 pl-6">
            <div className="text-[11px] text-slate-500 font-medium">
              Monthly
            </div>
            <div className="text-xl font-extrabold text-teal-400">
              {formatCurrency(totalMonthly)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
