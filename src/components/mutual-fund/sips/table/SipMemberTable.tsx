import { formatCurrency } from "@/helpers/formatters";
import SipMemberTableRow from "./SipMemberTableRow";
import type { SipMemberTableProps } from "@/types/sips";

export default function SipMemberTable({
  sips,
  monthCols,
  memberName,
  stats,
  onSelectFund,
}: SipMemberTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="bg-slate-950/50">
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[200px]">
              Scheme
            </th>
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[120px]">
              Folio
            </th>
            <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[100px]">
              SIP Amount
            </th>
            {monthCols.map((col) => (
              <th
                key={col}
                className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[75px]"
              >
                {col}
              </th>
            ))}
            <th className="px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[80px]">
              Status
            </th>
            <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[100px]">
              Holding Days
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {sips.map((sip, i) => (
            <SipMemberTableRow
              key={sip.id}
              sip={sip}
              monthCols={monthCols}
              index={i}
              onSelectFund={onSelectFund}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-700/60 bg-slate-950/40">
            <td
              colSpan={2}
              className="px-5 py-3 text-xs font-bold text-slate-400 uppercase"
            >
              {memberName.split(" ")[0]}&apos;s Total
            </td>
            <td className="px-5 py-3 text-right font-extrabold text-teal-400">
              {formatCurrency(stats?.memberTotal ?? 0)}
            </td>
            {monthCols.map((col) => {
              const colTotal = stats?.monthlyTotals[col] ?? 0;
              return (
                <td
                  key={col}
                  className={`px-3 py-3 text-right text-xs font-bold ${colTotal > 0 ? "text-teal-400" : "text-slate-600"}`}
                >
                  {colTotal > 0 ? `₹${colTotal.toLocaleString("en-IN")}` : "—"}
                </td>
              );
            })}
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
