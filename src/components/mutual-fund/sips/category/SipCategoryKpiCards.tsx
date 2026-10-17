import { IndianRupee, Layers, Sparkles, Repeat2 } from "lucide-react";
import { formatCurrency, formatPercent } from "@/helpers/formatters";
import type { SipCategoryKpiCardsProps } from "@/types/sips";

export default function SipCategoryKpiCards({
  data,
}: SipCategoryKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900/80 border border-teal-500/20 rounded-2xl p-5 shadow-md">
        <div className="inline-flex p-2 rounded-xl bg-teal-500/10 mb-3 border border-teal-500/20">
          <IndianRupee size={18} className="text-teal-400" />
        </div>
        <div className="text-2xl font-extrabold text-teal-400">
          {formatCurrency(data.totalMonthly)}
        </div>
        <div className="text-xs text-slate-400 mt-1 font-medium">
          Total Monthly SIP
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Across {data.categories.length} fund categories
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 shadow-md">
        <div className="inline-flex p-2 rounded-xl bg-slate-700/30 mb-3 border border-slate-700/50">
          <Layers size={18} className="text-slate-100" />
        </div>
        <div className="text-2xl font-extrabold text-slate-100 truncate">
          {data.categories[0]?.category || "—"}
        </div>
        <div className="text-xs text-slate-400 mt-1 font-medium">
          Top Category
        </div>
        <div className="text-[11px] text-teal-400 font-semibold mt-0.5">
          {data.categories[0]
            ? `${formatPercent(data.categories[0].pct)} of monthly SIP`
            : "—"}
        </div>
      </div>

      <div className="bg-slate-900/80 border border-violet-500/20 rounded-2xl p-5 shadow-md">
        <div className="inline-flex p-2 rounded-xl bg-violet-500/10 mb-3 border border-violet-500/20">
          <Sparkles size={18} className="text-violet-400" />
        </div>
        <div className="text-2xl font-extrabold text-violet-400">
          {data.tierBreakdown.largeCapCorePct.toFixed(0)}% /{" "}
          {data.tierBreakdown.midSmallCapPct.toFixed(0)}%
        </div>
        <div className="text-xs text-slate-400 mt-1 font-medium">
          Core vs Mid/Small Cap
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Foundation vs High Growth
        </div>
      </div>

      <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-5 shadow-md">
        <div className="inline-flex p-2 rounded-xl bg-emerald-500/10 mb-3 border border-emerald-500/20">
          <Repeat2 size={18} className="text-emerald-400" />
        </div>
        <div className="text-2xl font-extrabold text-emerald-400">
          {data.categories.length} Categories
        </div>
        <div className="text-xs text-slate-400 mt-1 font-medium">
          Diversification Span
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          {data.activeSipCount} active mandates running
        </div>
      </div>
    </div>
  );
}
