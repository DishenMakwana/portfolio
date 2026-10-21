import { formatIndianAmount } from "@/helpers/formatters";
import HoldingValuationRow from "@/components/mutual-fund/valuation/table/HoldingValuationRow";
import type { CategoryValuationBlockProps } from "@/types/valuation";

export default function CategoryValuationBlock({
  memberName,
  category,
  expandedFolios,
  onToggleFolio,
}: CategoryValuationBlockProps): React.JSX.Element {
  return (
    <>
      {/* Category Name Sub-header */}
      <tr className="bg-slate-900/40">
        <td
          colSpan={12}
          className="py-1.5 px-3 font-bold text-[11px] text-slate-300 tracking-wider"
        >
          {category.assetClass}
        </td>
      </tr>

      {/* Holding Rows */}
      {category.holdings.map((holding) => {
        const folioKey = `${memberName}_${holding.folioNo}_${holding.schemeId}`;
        const isExpanded = Boolean(expandedFolios[folioKey]);

        return (
          <HoldingValuationRow
            key={folioKey}
            folioKey={folioKey}
            holding={holding}
            isExpanded={isExpanded}
            onToggle={() => onToggleFolio(folioKey)}
          />
        );
      })}

      {/* Sub Total - Category Row */}
      <tr className="bg-slate-950/40 font-semibold text-slate-300 border-t border-b border-slate-800/80">
        <td
          colSpan={5}
          className="py-1.5 px-3 text-right font-semibold text-[11px] text-slate-400"
        >
          Sub Total - {category.assetClass} :
        </td>
        <td className="py-1.5 px-2 text-right font-semibold text-slate-200 whitespace-nowrap text-[11px]">
          {formatIndianAmount(category.totalPurchaseValue, 0)}
        </td>
        <td className="py-1.5 px-2 text-right font-semibold text-slate-200 whitespace-nowrap text-[11px]">
          {formatIndianAmount(category.totalCurrentValue, 0)}
        </td>
        <td
          className={`py-1.5 px-2 text-right font-semibold whitespace-nowrap text-[11px] ${
            category.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatIndianAmount(category.totalGain, 0)}
        </td>
        <td className="py-1.5 px-1.5 text-right font-semibold text-slate-300 whitespace-nowrap text-[11px]">
          {category.weightedHoldingDays.toLocaleString("en-IN")}
        </td>
        <td
          className={`py-1.5 px-1.5 text-right font-semibold whitespace-nowrap text-[11px] ${
            category.absReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {category.absReturnPct.toFixed(2)}
        </td>
        <td
          className={`py-1.5 px-2 text-right font-semibold whitespace-nowrap text-[11px] ${
            category.cagrPct >= 0 ? "text-teal-400" : "text-rose-400"
          }`}
        >
          {category.cagrPct.toFixed(2)}
        </td>
        <td
          className={`py-1.5 px-3 text-right font-semibold whitespace-nowrap text-[11px] ${
            category.xirrPct >= 0 ? "text-teal-400" : "text-rose-400"
          }`}
        >
          {category.xirrPct.toFixed(2)}
        </td>
      </tr>
    </>
  );
}
