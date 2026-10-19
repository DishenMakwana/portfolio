import { formatCurrency, formatDate } from "@/helpers/formatters";
import { getTransactionTaxStatusDetails } from "@/helpers/transactions";
import FolioBadge from "@/components/shared/FolioBadge";
import TaxStatusCell from "@/components/shared/TaxStatusCell";
import type { TransactionsTableRowProps } from "@/types/transactions";

export default function TransactionsTableRow({
  transaction: t,
  onNavigateFund,
}: TransactionsTableRowProps) {
  return (
    <tr className="transition hover:bg-slate-950/45">
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-200 font-medium text-xs sm:text-sm">
        {formatDate(t.date)}
      </td>
      <td className="px-3 py-2.5 min-w-[180px]">
        <div
          onClick={() => onNavigateFund(t.holdingId ?? `sold_${t.id}`)}
          className="font-bold text-slate-100 hover:text-teal-400 transition cursor-pointer text-xs sm:text-sm whitespace-normal leading-snug"
          title={t.schemeName}
        >
          {t.schemeName}
        </div>
        {t.category && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-1">
            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
              {t.category}
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <FolioBadge folioNo={t.folioNo} />
      </td>
      <td className="px-3 py-2.5 w-28 max-w-[120px]">
        <div
          className="font-medium text-slate-300 text-xs leading-snug break-words"
          title={t.memberName}
        >
          {t.memberName}
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex flex-col gap-1 items-start">
          <span
            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
              t.type === "BUY"
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                : "bg-red-950/80 text-red-400 border border-red-800/40"
            }`}
          >
            {t.type}
          </span>
          {t.transactionType && (
            <span className="text-[10px] text-slate-400 font-medium bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/60">
              {t.transactionType}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {(() => {
          const tax = getTransactionTaxStatusDetails(
            t.date,
            t.category,
            t.schemeName,
            t.type
          );
          return (
            <TaxStatusCell
              status={tax.status}
              days={tax.days}
              title={tax.title}
            />
          );
        })()}
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
        <div className="font-semibold text-slate-200 text-xs sm:text-sm">
          {t.units.toFixed(4)}
        </div>
        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
          ₹{t.nav.toFixed(4)}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right font-bold text-slate-100 text-xs sm:text-sm tabular-nums">
        {formatCurrency(t.amount)}
      </td>
      <td className="px-3 py-2.5 text-right font-medium text-amber-400/90 text-xs sm:text-sm tabular-nums">
        {t.stampDuty !== null && t.stampDuty !== undefined
          ? `₹${t.stampDuty.toFixed(2)}`
          : "—"}
      </td>
      <td className="px-3 py-2.5 text-right font-medium text-indigo-400 text-xs sm:text-sm tabular-nums whitespace-nowrap">
        {t.stt !== null && t.stt !== undefined && t.stt > 0 ? (
          <span className="font-bold text-indigo-300">₹{t.stt.toFixed(2)}</span>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
    </tr>
  );
}
