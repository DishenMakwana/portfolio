import { formatIndianAmount } from "@/helpers/formatters";
import SummaryMemberSection from "@/components/mutual-fund/summary/table/SummaryMemberSection";
import type { PortfolioSummaryTableProps } from "@/types/summary";

export default function PortfolioSummaryTable({
  filteredData,
  summary,
  expandedFolios,
  hasActiveFilters,
  onToggleFolio,
  onClearFilters,
}: PortfolioSummaryTableProps): React.JSX.Element {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="w-full">
        <table className="w-full table-fixed text-xs text-left border-collapse">
          {/* Header matching the teal theme with 11 structured columns */}
          <thead>
            <tr className="bg-[#00a884] text-white font-bold border-b border-teal-700 align-top text-[11px] leading-tight select-none">
              <th className="py-2.5 px-3 text-left font-bold tracking-wider w-[14%]">
                <div>Folio</div>
              </th>
              <th className="py-2.5 px-2.5 text-left font-bold tracking-wider w-[17.5%]">
                <div>Scheme</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7.5%]">
                <div>Purchase</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7%]">
                <div>Switch</div>
                <div>In</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7.5%]">
                <div>Redemption</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7%]">
                <div>Switch</div>
                <div>Out</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[8.5%]">
                <div>Current</div>
                <div>Value</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7.5%]">
                <div>Realized</div>
                <div>Gain</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7.5%]">
                <div>Unrealized</div>
                <div>Gain</div>
              </th>
              <th className="py-2.5 px-2 text-right font-bold tracking-wider w-[7.5%]">
                <div>XIRR</div>
                <div>(%)</div>
              </th>
              <th className="py-2.5 px-3 text-right font-bold tracking-wider w-[8.5%]">
                <div>Abs Return</div>
                <div>(%)</div>
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((m) => (
              <SummaryMemberSection
                key={m.memberId + m.memberName}
                member={m}
                expandedFolios={expandedFolios}
                onToggleFolio={onToggleFolio}
              />
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="py-12 text-center text-slate-400 font-medium bg-slate-900/40"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <p>
                      No holdings or transactions match your search criteria.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={onClearFilters}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {/* ── GRAND TOTAL STICKY / BOTTOM FOOTER ── */}
          {filteredData.length > 0 && (
            <tfoot>
              <tr className="bg-[#00a884] text-white font-extrabold text-xs border-t-2 border-teal-600">
                <td colSpan={2} className="py-3 px-3 text-left font-black">
                  Grand Total :
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalPurchase, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalSwitchIn, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalRedemption, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalSwitchOut, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalCurrent, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalRealized, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {formatIndianAmount(summary.totalUnrealized, 0)}
                </td>
                <td className="py-3 px-2 text-right">
                  {summary.xirrPct >= 0 ? "+" : ""}
                  {summary.xirrPct.toFixed(2)}%
                </td>
                <td className="py-3 px-3 text-right">
                  {summary.absReturnPct >= 0 ? "+" : ""}
                  {summary.absReturnPct.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
