import type {
  CustomTooltipProps,
  FundHistoricalTxMarker,
} from "@/types/fund-details";

export default function HistoricalReturnsChartTooltip({
  active,
  payload,
  benchmarkName,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  const fullDateStr = data.timestamp
    ? new Date(data.timestamp).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : data.date;

  return (
    <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[200px]">
      <div className="text-slate-400 font-semibold border-b border-slate-800 pb-1.5 flex items-center justify-between">
        <span>{fullDateStr}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-400 font-bold flex items-center gap-2">
            <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-500/25"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white"></span>
            </span>
            Fund Return:
          </span>
          <span className="font-bold text-slate-100">
            {data.fundReturn >= 0 ? "+" : ""}
            {data.fundReturn.toFixed(2)}%
          </span>
        </div>
        <div className="text-[11px] text-slate-400 pl-3.5 flex justify-between">
          <span>NAV:</span>
          <span>₹{data.fundNav.toFixed(2)}</span>
        </div>

        {data.benchReturn !== null && data.benchReturn !== undefined && (
          <>
            <div className="flex items-center justify-between gap-4 border-t border-slate-800/60 pt-1.5">
              <span className="text-indigo-400 font-bold flex items-center gap-2">
                <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-indigo-500/25"></span>
                  <span className="w-1.5 h-1.5 rotate-45 rounded-[0.5px] bg-indigo-400 border border-white"></span>
                </span>
                {benchmarkName || "Benchmark"}:
              </span>
              <span className="font-bold text-slate-100">
                {data.benchReturn >= 0 ? "+" : ""}
                {data.benchReturn.toFixed(2)}%
              </span>
            </div>
            {data.benchNav !== null && (
              <div className="text-[11px] text-slate-400 pl-3.5 flex justify-between">
                <span>Index NAV:</span>
                <span>₹{data.benchNav.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {data.txs && data.txs.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-1">
            {data.txs.map((tx: FundHistoricalTxMarker, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/50"
              >
                <span
                  className={`font-semibold ${
                    tx.type === "BUY" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {tx.type === "BUY" ? "BUY TRANSACTION" : "SELL TRANSACTION"}
                </span>
                {tx.amount > 0 && (
                  <span className="text-slate-200">
                    ₹{tx.amount.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
