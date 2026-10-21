import { formatIndianAmount } from "@/helpers/formatters";
import MemberValuationBlock from "@/components/mutual-fund/valuation/table/MemberValuationBlock";
import type { ValuationTableProps } from "@/types/valuation";

export default function ValuationTable({
  filteredData,
  summary,
  expandedFolios,
  hasActiveFilters,
  onToggleFolio,
  onResetFilters,
}: ValuationTableProps): React.JSX.Element {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          {/* Header matching the teal theme in screenshot with 2-line labels */}
          <thead>
            <tr className="bg-[#00a884] text-white font-bold border-b border-teal-700 align-top">
              <th className="py-2.5 px-3 text-left font-bold tracking-wider whitespace-nowrap w-[12%]">
                Folio
              </th>
              <th className="py-2.5 px-2.5 text-left font-bold tracking-wider whitespace-nowrap w-[22%]">
                Scheme
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[7.5%] leading-tight">
                <div>Balance</div>
                <div>Units</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[7%] leading-tight">
                <div>Purchase</div>
                <div>NAV</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[7%] leading-tight">
                <div>Current</div>
                <div>NAV</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[8%] leading-tight">
                <div>Purchase</div>
                <div>Value</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[8%] leading-tight">
                <div>Current</div>
                <div>Value</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[7.5%]">
                Gain
              </th>
              <th className="py-2.5 px-1.5 text-right font-bold tracking-wider whitespace-nowrap w-[6.5%] leading-tight">
                <div>Holding</div>
                <div>Days</div>
              </th>
              <th className="py-2.5 px-1.5 text-right font-bold tracking-wider whitespace-nowrap w-[7%] leading-tight">
                <div>Abs</div>
                <div>Return (%)</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider whitespace-nowrap w-[6.5%] leading-tight">
                <div>CAGR</div>
                <div>(%)</div>
              </th>
              <th className="py-2.5 px-3 text-right font-bold tracking-wider whitespace-nowrap w-[6.5%] leading-tight">
                <div>XIRR</div>
                <div>(%)</div>
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="text-center py-16 text-slate-400 font-medium"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p>No valuation records found matching your filters.</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((member) => (
                <MemberValuationBlock
                  key={member.memberName}
                  member={member}
                  expandedFolios={expandedFolios}
                  onToggleFolio={onToggleFolio}
                />
              ))
            )}
          </tbody>

          {/* ── STICKY GRAND TOTAL FOOTER BAR ── */}
          <tfoot>
            <tr className="bg-[#00a884] text-white font-extrabold border-t-2 border-teal-500 shadow-inner">
              <td
                colSpan={5}
                className="py-3 px-3 text-left font-black text-sm tracking-wide text-white"
              >
                Grand Total :
              </td>
              <td className="py-3 px-2 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {formatIndianAmount(summary.totalPurchaseValue, 0)}
              </td>
              <td className="py-3 px-2 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {formatIndianAmount(summary.totalCurrentValue, 0)}
              </td>
              <td className="py-3 px-2 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {formatIndianAmount(summary.totalGain, 0)}
              </td>
              <td className="py-3 px-1.5 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {summary.weightedHoldingDays.toLocaleString("en-IN")}
              </td>
              <td className="py-3 px-1.5 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {summary.absReturnPct.toFixed(2)}
              </td>
              <td className="py-3 px-2 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {summary.cagrPct.toFixed(2)}
              </td>
              <td className="py-3 px-3 text-right font-black text-xs tracking-tight text-white whitespace-nowrap">
                {summary.xirrPct.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
