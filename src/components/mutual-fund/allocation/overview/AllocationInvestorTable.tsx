import { formatIndianNumber, formatPct } from "@/helpers/formatters";
import AllocationSortTh from "../common/AllocationSortTh";
import AllocationTotalRow from "../common/AllocationTotalRow";
import type { AllocationInvestorTableProps } from "@/types/allocation";

export default function AllocationInvestorTable({
  sortedMembers,
  grandTotal,
  sortCol,
  sortDir,
  onSort,
}: AllocationInvestorTableProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <AllocationSortTh
              label="Investor"
              col="name"
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={onSort}
              className="text-left text-slate-400"
            />
            <AllocationSortTh
              label="Amount"
              col="value"
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={onSort}
              className="text-right text-slate-400"
            />
            <AllocationSortTh
              label="Share(%)"
              col="value"
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={onSort}
              className="text-right text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28"
            />
          </tr>
        </thead>
        <tbody>
          <AllocationTotalRow
            cells={["Total", formatIndianNumber(grandTotal), "100.00"]}
          />
          {sortedMembers.map((m, i) => (
            <tr
              key={m.name}
              className={`border-t border-slate-800/60 hover:bg-slate-800/20 transition ${
                i % 2 === 1 ? "bg-slate-950/20" : ""
              }`}
            >
              <td className="px-5 py-3 text-slate-200 font-medium text-xs uppercase tracking-wide">
                {m.name}
              </td>
              <td className="px-5 py-3 text-right text-slate-200 tabular-nums font-medium">
                {formatIndianNumber(m.value)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-300 bg-teal-500/5 border-l border-teal-500/10">
                {formatPct(m.pct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
