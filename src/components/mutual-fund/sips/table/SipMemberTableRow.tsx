import FolioBadge from "@/components/shared/FolioBadge";
import { formatCurrency, getFundDetailsUrl } from "@/helpers/formatters";
import { formatHoldingDuration } from "@/helpers/dates";
import type { SipMemberTableRowProps } from "@/types/sips";

export default function SipMemberTableRow({
  sip,
  monthCols,
  index: i,
  onSelectFund,
}: SipMemberTableRowProps) {
  const fundUrl = sip.holdingId
    ? getFundDetailsUrl(sip.holdingId)
    : sip.txId
      ? getFundDetailsUrl(sip.txId, true)
      : null;

  return (
    <tr
      key={sip.id}
      onClick={() => {
        if (fundUrl) onSelectFund(fundUrl);
      }}
      className={`transition ${fundUrl ? "cursor-pointer hover:bg-slate-800/40 group" : ""} ${
        i % 2 === 0 ? "" : "bg-slate-950/20"
      }`}
    >
      <td className="px-5 py-3 font-medium text-slate-200 max-w-xs">
        <div className="truncate font-semibold transition group-hover:text-teal-400 group-hover:underline underline-offset-4">
          {sip.schemeName}
        </div>
      </td>
      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
        <FolioBadge folioNo={sip.folioNo} />
      </td>
      <td className="px-5 py-3 text-right font-bold text-slate-100">
        {formatCurrency(sip.monthlyAmount)}
      </td>

      {monthCols.map((col) => {
        const amt = sip.monthlyHistory[col] ?? 0;
        return (
          <td
            key={col}
            className={`px-3 py-3 text-right text-xs font-semibold ${amt > 0 ? "text-emerald-400" : "text-slate-600"}`}
          >
            {amt > 0 ? `₹${amt.toLocaleString("en-IN")}` : "—"}
          </td>
        );
      })}
      <td className="px-5 py-3 text-center">
        {sip.isActive ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            Paused
          </span>
        )}
      </td>
      {(() => {
        const duration = formatHoldingDuration(sip.firstTxDate);
        return (
          <td className="px-5 py-3 text-right whitespace-nowrap">
            {duration ? (
              <div>
                <div className="font-extrabold text-slate-100 text-sm tracking-tight">
                  {duration.days}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {duration.label}
                </div>
              </div>
            ) : (
              <span className="text-slate-600 text-xs">—</span>
            )}
          </td>
        );
      })()}
    </tr>
  );
}
