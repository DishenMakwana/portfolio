import { formatIndianNumber } from "@/helpers/formatters";
import AllocationTotalRow from "../common/AllocationTotalRow";
import type { AllocationProductTableProps } from "@/types/allocation";

export default function AllocationProductTable({
  grandTotal,
}: AllocationProductTableProps) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 hover:translate-y-[-2px] transition-all duration-300">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">
              Product
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-teal-400 bg-teal-500/10 border-l border-teal-500/20 w-28 whitespace-nowrap">
              Share(%)
            </th>
          </tr>
        </thead>
        <tbody>
          <AllocationTotalRow
            cells={["Total", formatIndianNumber(grandTotal), "100.00"]}
          />
          <tr className="border-t border-slate-800/60 hover:bg-slate-800/20 transition">
            <td className="px-5 py-3 text-slate-300 font-medium">
              Mutual Fund
            </td>
            <td className="px-5 py-3 text-right text-slate-300 tabular-nums">
              {formatIndianNumber(grandTotal)}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-slate-300 bg-teal-500/5 border-l border-teal-500/10 tabular-nums">
              100.00
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
