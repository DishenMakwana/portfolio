"use client";

import { useMemo } from "react";
import TableSortIcon from "@/components/shared/TableSortIcon";
import { getAllocationColumns } from "@/helpers/allocationAnalysis";
import AllocationAnalysisTableRow from "./AllocationAnalysisTableRow";
import type { AllocationAnalysisTableProps } from "@/types/insights";

export default function AllocationAnalysisTable({
  entityLabel,
  entityDescription,
  analysisData,
  sortedAnalysisData,
  sortKey,
  sortDir,
  onSort,
  rankMap,
  expandedItems,
  onToggleExpand,
  niftyBenchmark,
  schemes,
}: AllocationAnalysisTableProps) {
  const allocationColumns = useMemo(
    () => getAllocationColumns(entityLabel),
    [entityLabel]
  );

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Table Title Header Bar */}
      <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
              {entityLabel === "AMC"
                ? "AMC Exposure & Performance"
                : entityLabel === "Category"
                  ? "Category Allocation & Performance"
                  : `${entityLabel} Allocation & Performance`}
            </h3>
            <span className="text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-full px-2.5 py-0.5">
              {analysisData.length}{" "}
              {analysisData.length === 1
                ? entityLabel
                : entityLabel === "AMC"
                  ? "AMCs"
                  : entityLabel === "Category"
                    ? "Categories"
                    : `${entityLabel}s`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Detailed breakdown of portfolio {entityDescription} by weights,
            returns, and holding periods
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-12 select-none">
                #
              </th>
              {allocationColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap"
                  onClick={() => onSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <TableSortIcon
                      isActive={sortKey === col.key}
                      sortOrder={sortDir}
                      className="shrink-0"
                    />
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                Folios
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sortedAnalysisData.map((amc, i) => (
              <AllocationAnalysisTableRow
                key={amc.name}
                amc={amc}
                index={i}
                rank={rankMap.get(amc.name)}
                isExpanded={expandedItems.has(amc.name)}
                onToggleExpand={() => onToggleExpand(amc.name)}
                niftyBenchmark={niftyBenchmark}
                entityLabel={entityLabel}
                schemes={schemes}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
