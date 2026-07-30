import { formatInr } from "@/helpers/formatters";
import type { FinancialYearSnapshotTabProps } from "@/types/insights";

export default function FinancialYearSnapshotTab({
  snapshot,
}: FinancialYearSnapshotTabProps) {
  const snapshotRows = snapshot.rows.filter((row) => row.label !== "XIRR (%)");
  const hasDebtOthersActivity = snapshotRows.some(
    (row) => row.debtOthers !== 0
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-500/20 bg-slate-900/70 backdrop-blur-md p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Portfolio Current Financial Year Snapshot
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {snapshot.label} · {snapshot.startDate} to {snapshot.endDate}
            </p>
          </div>
          <span className="text-xs text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1.5">
            Mutual fund portfolio
          </span>
        </div>

        <div className="overflow-x-auto mt-5">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-teal-500/20 text-teal-200">
                <th className="px-4 py-3 text-left font-bold">Movement</th>
                <th className="px-4 py-3 text-right font-bold">Equity</th>
                <th className="px-4 py-3 text-right font-bold">Hybrid</th>
                <th className="px-4 py-3 text-right font-bold">
                  Debt &amp; Others
                </th>
                <th className="px-4 py-3 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.rows.map((row) => {
                const isXirr = row.label === "XIRR (%)";
                const isEmphasis =
                  row.label === "Opening Balance" ||
                  row.label === "Closing Balance" ||
                  row.label === "Net Gain";
                const formatValue = (value: number): string =>
                  Number.isNaN(value)
                    ? "-"
                    : isXirr
                      ? value.toFixed(2) + "%"
                      : formatInr(value);
                const values = isXirr
                  ? [
                      row.equityXirr || 0,
                      row.hybridXirr || 0,
                      hasDebtOthersActivity
                        ? row.debtOthersXirr || 0
                        : Number.NaN,
                      row.totalXirr || 0,
                    ]
                  : [row.equity, row.hybrid, row.debtOthers, row.total];

                return (
                  <tr
                    key={row.label}
                    className={
                      isXirr
                        ? "border-b border-slate-800/70 last:border-b-0 bg-teal-500/15 text-teal-200"
                        : isEmphasis
                          ? "border-b border-slate-800/70 last:border-b-0 text-slate-100"
                          : "border-b border-slate-800/70 last:border-b-0 text-slate-300"
                    }
                  >
                    <td className="px-4 py-3 font-semibold">{row.label}</td>
                    {values.map((value, index) => (
                      <td
                        key={row.label + "-" + index}
                        className={
                          !isXirr && value < 0
                            ? "px-4 py-3 text-right tabular-nums text-rose-400"
                            : "px-4 py-3 text-right tabular-nums"
                        }
                      >
                        {formatValue(value)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-4">
          Purchase and redemption values come from recorded transactions. Switch
          and dividend rows remain zero until those transaction types are
          available in imported data.
        </p>
      </div>
    </div>
  );
}
