import { formatIndianAmount } from "@/helpers/formatters";
import SummaryHoldingRowGroup from "@/components/mutual-fund/summary/table/SummaryHoldingRowGroup";
import type { SummaryCategorySectionProps } from "@/types/summary";

export default function SummaryCategorySection({
  category,
  memberName,
  expandedFolios,
  onToggleFolio,
}: SummaryCategorySectionProps): React.JSX.Element {
  return (
    <>
      {/* Category Heading Row */}
      <tr className="bg-slate-900/60 border-t border-slate-800/60">
        <td
          colSpan={11}
          className="py-2 px-3 text-slate-300 font-bold text-xs tracking-wider"
        >
          {category.assetClass}
        </td>
      </tr>

      {/* Holdings Rows */}
      {category.holdings.map((h) => {
        const rowKey = `${memberName}_${h.schemeId}_${h.folioNo}`;
        const isExpanded = !!expandedFolios[rowKey];

        return (
          <SummaryHoldingRowGroup
            key={rowKey}
            holding={h}
            rowKey={rowKey}
            isExpanded={isExpanded}
            onToggle={() => onToggleFolio(rowKey)}
          />
        );
      })}

      {/* Sub Total - Category Row */}
      <tr className="border-t border-slate-800 bg-slate-900/70 font-bold text-slate-200 text-xs">
        <td colSpan={2} className="py-2 px-3 text-right text-slate-400">
          Sub Total - {category.assetClass} :
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalPurchase, 0)}
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalSwitchIn, 0)}
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalRedemption, 0)}
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalSwitchOut, 0)}
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalCurrentValue, 0)}
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalRealizedGain, 0)}
        </td>
        <td className="py-2 px-2 text-right">
          {formatIndianAmount(category.totalUnrealizedGain, 0)}
        </td>
        <td
          className={`py-2 px-2 text-right font-semibold ${
            category.xirrPct >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {category.xirrPct >= 0 ? "+" : ""}
          {category.xirrPct.toFixed(2)}%
        </td>
        <td
          className={`py-2 px-3 text-right font-semibold ${
            category.absReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {category.absReturnPct >= 0 ? "+" : ""}
          {category.absReturnPct.toFixed(2)}%
        </td>
      </tr>
    </>
  );
}
