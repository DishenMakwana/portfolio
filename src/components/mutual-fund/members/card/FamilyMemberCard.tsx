import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import DeltaBadge from "@/components/shared/DeltaBadge";
import {
  formatCurrency,
  formatPercent,
  formatMetricDiff,
} from "@/helpers/formatters";
import FamilyMemberDematDrawer from "./FamilyMemberDematDrawer";
import type { FamilyMemberCardProps } from "@/types/members";

export default function FamilyMemberCard({
  member,
  schemesCount,
  reportId,
  isExpanded,
  onToggleDemat,
}: FamilyMemberCardProps) {
  const mInvDiff = formatMetricDiff(member.investedDelta, "", "");
  const mCvDiff = formatMetricDiff(member.currentValueDelta, "", "");
  const isNsdl = !!(member.dpId && member.dpId.startsWith("IN"));

  const isDeceased =
    member.accountStatus?.toUpperCase() === "DECEASED" ||
    member.name === "SHAILESH RAMJIBHAI MAKWANA";

  const hasValidXirr =
    member.xirr !== undefined && member.xirr !== null && member.xirr !== 0;

  return (
    <div className="block bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 text-left relative overflow-hidden">
      {member.dpId && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-500/5 to-transparent pointer-events-none" />
      )}
      <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-4">
        <div>
          <h4 className="font-bold text-lg text-slate-100 flex items-center gap-2 flex-wrap">
            <span>{member.name}</span>
            {isDeceased && (
              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-0.5 rounded-full font-extrabold tracking-wide uppercase inline-flex items-center">
                Died
              </span>
            )}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {member.pan && (
              <span className="bg-slate-850 text-slate-400 text-xs px-2 py-0.5 rounded">
                PAN: {member.pan}
              </span>
            )}
            <Link
              href={
                reportId
                  ? {
                      pathname: "/holdings",
                      query: { member: member.name, reportId },
                    }
                  : {
                      pathname: "/holdings",
                      query: { member: member.name },
                    }
              }
              className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition"
            >
              View Holdings <ExternalLink size={12} />
            </Link>
          </div>
          <div className="mt-2">
            <span className="bg-slate-900/40 border border-slate-800/60 text-slate-300 text-[11px] px-2 py-0.5 rounded font-semibold whitespace-nowrap">
              {schemesCount} {schemesCount === 1 ? "Scheme" : "Schemes"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-400">XIRR</div>
          <div
            className={`text-2xl font-black ${
              hasValidXirr ? "text-teal-400" : "text-slate-400"
            }`}
          >
            {hasValidXirr ? formatPercent(member.xirr) : "0.00%"}
          </div>
          <div className="mt-1">
            {hasValidXirr && member.xirrDelta !== null && (
              <DeltaBadge delta={member.xirrDelta} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-4 font-semibold">
        {/* ROW 1: Left (Invested), Center (Current Value), Right (Net Returns) */}
        <div className="min-w-0 text-left">
          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Invested
          </div>
          <div
            className="text-xs sm:text-sm font-extrabold text-slate-200 mt-1 tracking-tight whitespace-nowrap"
            title={formatCurrency(member.invested)}
          >
            {formatCurrency(member.invested)}
          </div>
          {mInvDiff.sub && (
            <div
              className={`text-[10px] ${mInvDiff.subColor} mt-0.5 whitespace-nowrap`}
            >
              {mInvDiff.sub}
            </div>
          )}
        </div>

        <div className="min-w-0 text-center flex flex-col items-center">
          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Current Value
          </div>
          <div
            className="text-xs sm:text-sm font-extrabold text-slate-200 mt-1 tracking-tight whitespace-nowrap"
            title={formatCurrency(member.currentValue)}
          >
            {formatCurrency(member.currentValue)}
          </div>
          {mCvDiff.sub && (
            <div
              className={`text-[10px] ${mCvDiff.subColor} mt-0.5 whitespace-nowrap`}
            >
              {mCvDiff.sub}
            </div>
          )}
        </div>

        <div className="min-w-0 text-right flex flex-col items-end">
          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Net Returns
          </div>
          <div
            className={`text-xs sm:text-sm font-extrabold mt-1 tracking-tight whitespace-nowrap ${
              member.gain >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
            title={formatCurrency(member.gain)}
          >
            {formatCurrency(member.gain)}
          </div>
          {member.invested > 0 && (
            <div
              className={`text-[10px] font-bold mt-0.5 whitespace-nowrap ${
                member.gain >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {member.gain >= 0 ? "+" : ""}
              {((member.gain / member.invested) * 100).toFixed(2)}%{" Absolute"}
            </div>
          )}
        </div>

        {/* ROW 2: Left (CAGR), Center (Alpha), Right (Placeholder) */}
        <div className="min-w-0 text-left">
          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
            CAGR
          </div>
          <div
            className={`text-xs sm:text-sm font-extrabold mt-1 tracking-tight whitespace-nowrap ${
              schemesCount === 0 || member.currentValue <= 0
                ? "text-slate-400"
                : "text-teal-400"
            }`}
          >
            {schemesCount === 0 || member.currentValue <= 0
              ? "0.00%"
              : formatPercent(member.cagr)}
          </div>
          <div className="mt-0.5 flex justify-start">
            {schemesCount > 0 && member.currentValue > 0 && (
              <DeltaBadge delta={member.cagrDelta} label="" />
            )}
          </div>
        </div>

        <div className="min-w-0 text-center flex flex-col items-center">
          <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Alpha
          </div>
          <div
            className={`text-xs sm:text-sm font-extrabold mt-1 tracking-tight whitespace-nowrap ${
              member.alpha === 0
                ? "text-slate-400"
                : member.alpha >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
            }`}
          >
            {member.alpha === 0 ? "0.00%" : formatPercent(member.alpha)}
          </div>
          <div className="mt-0.5 flex justify-center">
            {member.alphaDelta !== null && (
              <DeltaBadge delta={member.alphaDelta} label="" />
            )}
          </div>
        </div>

        <div className="min-w-0" />
      </div>

      {/* COLLAPSIBLE DEMAT DETAILS SECTION */}
      {member.dpId && (
        <>
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex justify-between items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleDemat}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer select-none"
            >
              {isExpanded ? (
                <>
                  Hide Demat Details{" "}
                  <ChevronUp size={14} className="text-teal-400" />
                </>
              ) : (
                <>
                  Show Demat Details{" "}
                  <ChevronDown size={14} className="text-teal-400" />
                </>
              )}
            </button>

            <div className="flex items-center gap-1 text-[10px] text-teal-300 font-bold bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
              <ShieldCheck size={12} className="text-teal-400" />{" "}
              {isNsdl ? "NSDL" : "CDSL"} DEMAT • {member.accountStatus}
            </div>
          </div>

          {isExpanded && (
            <FamilyMemberDematDrawer member={member} isNsdl={isNsdl} />
          )}
        </>
      )}
    </div>
  );
}
