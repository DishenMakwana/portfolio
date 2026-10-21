import { formatIndianAmount } from "@/helpers/formatters";
import CategoryValuationBlock from "@/components/mutual-fund/valuation/table/CategoryValuationBlock";
import type { MemberValuationBlockProps } from "@/types/valuation";

export default function MemberValuationBlock({
  member,
  expandedFolios,
  onToggleFolio,
}: MemberValuationBlockProps): React.JSX.Element {
  return (
    <>
      {/* Member Header Row */}
      <tr className="bg-slate-950/70 border-t border-slate-800">
        <td
          colSpan={12}
          className="py-2.5 px-3 text-[#00cba0] font-extrabold text-xs uppercase tracking-wide"
        >
          {member.memberName}
          {member.memberPan ? ` : ${member.memberPan}` : ""}
        </td>
      </tr>

      {/* Asset Class Categories */}
      {member.categories.map((cat) => (
        <CategoryValuationBlock
          key={cat.assetClass}
          memberName={member.memberName}
          category={cat}
          expandedFolios={expandedFolios}
          onToggleFolio={onToggleFolio}
        />
      ))}

      {/* Sub Total - Member Row */}
      <tr className="bg-slate-950/90 font-extrabold text-slate-100 border-t border-b-2 border-slate-700">
        <td
          colSpan={5}
          className="py-2 px-3 text-left font-extrabold text-[11.5px] text-slate-200 tracking-wide"
        >
          Sub Total - {member.memberName} :
        </td>
        <td className="py-2 px-2 text-right font-bold text-slate-100 whitespace-nowrap text-xs">
          {formatIndianAmount(member.totalPurchaseValue, 0)}
        </td>
        <td className="py-2 px-2 text-right font-bold text-slate-100 whitespace-nowrap text-xs">
          {formatIndianAmount(member.totalCurrentValue, 0)}
        </td>
        <td
          className={`py-2 px-2 text-right font-bold whitespace-nowrap text-xs ${
            member.totalGain >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatIndianAmount(member.totalGain, 0)}
        </td>
        <td className="py-2 px-1.5 text-right font-bold text-slate-200 whitespace-nowrap text-xs">
          {member.weightedHoldingDays.toLocaleString("en-IN")}
        </td>
        <td
          className={`py-2 px-1.5 text-right font-bold whitespace-nowrap text-xs ${
            member.absReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {member.absReturnPct.toFixed(2)}
        </td>
        <td
          className={`py-2 px-2 text-right font-bold whitespace-nowrap text-xs ${
            member.cagrPct >= 0 ? "text-teal-400" : "text-rose-400"
          }`}
        >
          {member.cagrPct.toFixed(2)}
        </td>
        <td
          className={`py-2 px-3 text-right font-bold whitespace-nowrap text-xs ${
            member.xirrPct >= 0 ? "text-teal-400" : "text-rose-400"
          }`}
        >
          {member.xirrPct.toFixed(2)}
        </td>
      </tr>
    </>
  );
}
