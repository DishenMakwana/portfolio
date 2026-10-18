import { formatIndianAmount } from "@/helpers/formatters";
import SummaryCategorySection from "@/components/mutual-fund/summary/table/SummaryCategorySection";
import type { SummaryMemberSectionProps } from "@/types/summary";

export default function SummaryMemberSection({
  member,
  expandedFolios,
  onToggleFolio,
}: SummaryMemberSectionProps): React.JSX.Element {
  return (
    <>
      {/* Member Header Row */}
      <tr className="border-t border-slate-800 bg-slate-900/90">
        <td colSpan={11} className="py-3 px-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00c9a7] font-extrabold tracking-wide uppercase text-xs sm:text-sm">
              {member.memberName}{" "}
              {member.memberPan ? `: ${member.memberPan}` : ""}
            </span>
            {member.isDeceased && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-widest">
                Deceased
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Asset Class Category Groups */}
      {member.categories.map((cat) => (
        <SummaryCategorySection
          key={cat.assetClass}
          category={cat}
          memberName={member.memberName}
          expandedFolios={expandedFolios}
          onToggleFolio={onToggleFolio}
        />
      ))}

      {/* Sub Total - Member Row */}
      <tr className="border-t border-b-2 border-slate-700 bg-slate-900/95 font-bold text-slate-100 text-xs">
        <td colSpan={2} className="py-2.5 px-3 text-left">
          Sub Total - {member.memberName} :
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalPurchase, 0)}
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalSwitchIn, 0)}
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalRedemption, 0)}
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalSwitchOut, 0)}
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalCurrentValue, 0)}
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalRealizedGain, 0)}
        </td>
        <td className="py-2.5 px-2 text-right">
          {formatIndianAmount(member.totalUnrealizedGain, 0)}
        </td>
        <td
          className={`py-2.5 px-2 text-right font-semibold ${
            member.xirrPct >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {member.xirrPct >= 0 ? "+" : ""}
          {member.xirrPct.toFixed(2)}%
        </td>
        <td
          className={`py-2.5 px-3 text-right font-semibold ${
            member.absReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {member.absReturnPct >= 0 ? "+" : ""}
          {member.absReturnPct.toFixed(2)}%
        </td>
      </tr>
    </>
  );
}
