import MsflHoldingsTableTopBar from "./MsflHoldingsTableTopBar";
import MsflHoldingsTableRow from "./MsflHoldingsTableRow";
import MsflHoldingsTotalRow from "./MsflHoldingsTotalRow";
import type { MsflHoldingsTableProps } from "@/types/msfl";

export default function MsflHoldingsTable({
  paginatedHoldings,
  filteredHoldingsCount,
  page,
  totalPages,
  toggleSort,
  renderSortIcon,
  rankMap,
  onSelectHolding,
  handleEditMapping,
  searchQuery,
  onClearSearch,
  stockTotals,
}: MsflHoldingsTableProps) {
  return (
    <>
      {/* Table Top Bar with Page & Counter */}
      <MsflHoldingsTableTopBar
        page={page}
        totalPages={totalPages}
        paginatedCount={paginatedHoldings.length}
        filteredCount={filteredHoldingsCount}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-850">
              <th className="p-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-12 select-none">
                #
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort("symbol")}
              >
                <div className="flex items-center gap-1">
                  Stock {renderSortIcon("symbol")}
                </div>
              </th>
              <th className="p-4 select-none text-right whitespace-nowrap">
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSort("quantity")}
                    className="flex items-center justify-end gap-1 hover:text-slate-200 cursor-pointer"
                  >
                    <span>Qty</span>
                    {renderSortIcon("quantity")}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSort("averagePrice")}
                    className="flex items-center justify-end gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <span>Avg Cost</span>
                    {renderSortIcon("averagePrice")}
                  </button>
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right whitespace-nowrap"
                onClick={() => toggleSort("currentPrice")}
              >
                <div className="flex items-center justify-end gap-1">
                  <div className="leading-tight">
                    <div>CURRENT</div>
                    <div>NAV</div>
                  </div>
                  {renderSortIcon("currentPrice")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleSort("investedValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Invested {renderSortIcon("investedValue")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleSort("currentValue")}
              >
                <div className="flex items-center justify-end gap-1">
                  Valuation {renderSortIcon("currentValue")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleSort("unrealizedPnl")}
              >
                <div className="flex items-center justify-end gap-1">
                  Profit / Loss {renderSortIcon("unrealizedPnl")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleSort("cagr")}
              >
                <div className="flex items-center justify-end gap-1">
                  CAGR {renderSortIcon("cagr")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none text-right"
                onClick={() => toggleSort("alpha")}
              >
                <div className="flex items-center justify-end gap-1">
                  Alpha {renderSortIcon("alpha")}
                </div>
              </th>
              <th
                className="p-4 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => toggleSort("athCorrectionPct")}
              >
                <div className="flex items-center gap-1">
                  <div className="leading-tight">
                    <div>ATH &</div>
                    <div>DIP</div>
                  </div>
                  {renderSortIcon("athCorrectionPct")}
                </div>
              </th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 text-slate-300 text-sm">
            {paginatedHoldings.length > 0 ? (
              paginatedHoldings.map((h) => (
                <MsflHoldingsTableRow
                  key={h.id}
                  holding={h}
                  rank={rankMap.get(h.symbol) ?? "-"}
                  onSelectHolding={onSelectHolding}
                  onEditMapping={handleEditMapping}
                />
              ))
            ) : (
              <tr>
                <td colSpan={11} className="p-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm">
                      No stocks found matching search query.
                    </p>
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={onClearSearch}
                        className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition underline cursor-pointer"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {stockTotals && (
              <MsflHoldingsTotalRow
                stockTotals={stockTotals}
                filteredCount={filteredHoldingsCount}
              />
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
