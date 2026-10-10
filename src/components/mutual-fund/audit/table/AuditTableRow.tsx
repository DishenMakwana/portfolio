import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import FolioBadge from "@/components/shared/FolioBadge";
import { getOverlapSubCategory } from "@/helpers/allocation";
import { formatAuditStatusBadge } from "@/helpers/audit";
import { formatCurrency } from "@/helpers/formatters";
import type { AuditTableRowProps } from "@/types/audit";

export default function AuditTableRow({
  item,
  idx,
  rank,
  onItemClick,
}: AuditTableRowProps) {
  const badge = formatAuditStatusBadge(item.auditStatus);
  const isMismatch = item.auditStatus === "UNIT_COST_MISMATCH";

  return (
    <motion.tr
      key={`unmatched-${item.holdingId}-${item.memberName}-${idx}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => onItemClick(item)}
      className={`transition-colors hover:bg-slate-800/50 cursor-pointer group ${
        isMismatch ? "bg-rose-950/10" : ""
      }`}
    >
      {/* 0. Index / Rank */}
      <td className="p-3 w-10 text-center text-xs font-bold text-slate-500 align-top">
        {rank ?? idx + 1}
      </td>

      {/* 1. Member & Folio */}
      <td className="px-3 py-3 align-top">
        <div className="font-bold text-slate-100">{item.memberName}</div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
          <FolioBadge folioNo={item.folioNo} />
          {!item.isActive && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Inactive
            </span>
          )}
        </div>
      </td>

      {/* 2. Scheme & Category */}
      <td className="px-3 py-3 align-top">
        <div className="font-bold text-slate-100 group-hover:text-emerald-400 text-xs leading-snug transition-colors flex items-center gap-1">
          <span>{item.schemeName}</span>
          <ExternalLink className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          {getOverlapSubCategory(item.schemeName, item.schemeCategory)}
        </div>
      </td>

      {/* 3. Units Breakdown */}
      <td className="px-3 py-3 align-top">
        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">CAS:</span>
            <span className="font-semibold text-slate-200 tabular-nums">
              {item.casBalanceUnits.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Tx Net:</span>
            <span className="font-semibold text-slate-200 tabular-nums">
              {item.txNetUnits.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60 font-bold">
            <span className="text-slate-400">Diff:</span>
            <span
              className={
                Math.abs(item.unitDifference) < 0.001
                  ? "text-emerald-400"
                  : "text-rose-400"
              }
            >
              {item.unitDifference >= 0 ? "+" : ""}
              {item.unitDifference.toFixed(3)}
            </span>
          </div>
        </div>
      </td>

      {/* 4. Cost Basis & Charges (₹) */}
      <td className="px-3 py-3 align-top">
        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">CAS Cost:</span>
            <span className="font-semibold text-slate-200 tabular-nums">
              {formatCurrency(item.casPurchaseValue)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Tx Net Amt:</span>
            <span className="font-semibold text-slate-200 tabular-nums">
              {formatCurrency(item.txNetAmount)}
            </span>
          </div>
          {(item.totalStt > 0 || item.totalStampDuty > 0) && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">STT+Stamp:</span>
              <span className="text-slate-400 tabular-nums">
                +{formatCurrency(item.totalStt + item.totalStampDuty)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60">
            <span className="text-slate-400">Net+Charges:</span>
            <span className="font-semibold text-sky-300 tabular-nums">
              {formatCurrency(item.txNetAmountWithCharges)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] pt-0.5 border-t border-slate-800/60 font-bold">
            <span className="text-slate-400">Amt Diff:</span>
            <span
              className={
                Math.abs(item.amountDifference) < 1.0
                  ? "text-emerald-400"
                  : "text-amber-400"
              }
            >
              {item.amountDifference >= 0 ? "+" : ""}
              {formatCurrency(item.amountDifference)}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 pt-0.5">
            Buy: {formatCurrency(item.totalBuyAmount)} | Sell:{" "}
            {formatCurrency(item.totalSellAmount)}
          </div>
        </div>
      </td>

      {/* 5. Valuation & Status */}
      <td className="px-3 py-3 align-top space-y-2">
        <div>
          <div className="text-[10px] text-slate-400">CAS Current Value</div>
          <div className="font-extrabold text-teal-400 text-sm tabular-nums">
            {formatCurrency(item.casCurrentValue)}
          </div>
        </div>
        <div>
          <span
            className={`inline-block whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${badge.badgeClass}`}
          >
            {badge.label}
          </span>
        </div>
      </td>

      {/* 6. Root Cause & Analysis */}
      <td className="px-3 py-3 align-top">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 text-[11px] leading-snug text-slate-300">
          {item.rootCauseAnalysis}
        </div>
      </td>
    </motion.tr>
  );
}
