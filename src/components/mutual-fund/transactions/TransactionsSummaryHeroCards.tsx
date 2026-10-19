import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { TransactionsSummaryHeroCardsProps } from "@/types/transactions";

export default function TransactionsSummaryHeroCards({
  summary,
}: TransactionsSummaryHeroCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* 1. Total Filtered Records */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold leading-tight">
              Total
              <br />
              Transactions
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-100 tracking-tight">
            {summary.totalCount.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">
          All matching statements
        </div>
      </div>

      {/* 2. Total Inflow (Buy) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-emerald-950/20">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        <div>
          <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
            <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold leading-tight">
              Total Buy
              <br />
              (Inflow)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-center leading-tight">
              Buy
              <br />
              Volume
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-1.5">
            <TrendingUp size={18} className="text-emerald-400 shrink-0" />
            <span>{formatCurrency(summary.totalBuyAmount)}</span>
          </div>
        </div>
        <div className="text-[11px] text-emerald-400/80 mt-2 font-medium">
          {summary.totalBuyCount.toLocaleString("en-IN")} entries • Total
          capital invested
        </div>
      </div>

      {/* 3. Total Outflow (Sell) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-rose-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-rose-950/20">
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        <div>
          <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
            <span className="text-[11px] text-rose-400 uppercase tracking-wider font-bold leading-tight">
              Total Sell
              <br />
              (Outflow)
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 text-center leading-tight">
              Sell
              <br />
              Volume
            </span>
          </div>
          <div className="text-xl font-extrabold text-rose-400 tracking-tight flex items-center gap-1.5">
            <TrendingDown size={18} className="text-rose-400 shrink-0" />
            <span>{formatCurrency(summary.totalSellAmount)}</span>
          </div>
        </div>
        <div className="text-[11px] text-rose-400/80 mt-2 font-medium">
          {summary.totalSellCount.toLocaleString("en-IN")} entries • Redeemed /
          withdrawn
        </div>
      </div>

      {/* 4. Net Inflow */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-teal-500/30 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-teal-950/20">
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
        <div>
          <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
            <span className="text-[11px] text-teal-400 uppercase tracking-wider font-bold leading-tight">
              Net
              <br />
              Inflow
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30 text-center leading-tight">
              Buy −
              <br />
              Sell
            </span>
          </div>
          <div className="text-xl font-extrabold text-teal-300 tracking-tight flex items-center gap-1.5">
            <Wallet size={18} className="text-teal-400 shrink-0" />
            <span>{formatCurrency(summary.netInflowAmount)}</span>
          </div>
        </div>
        <div className="text-[11px] text-teal-400/80 mt-2 font-medium">
          Net capital flow for filtered entries
        </div>
      </div>

      {/* 5. Regulatory Taxes & Charges */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1 mb-2 min-h-[36px]">
            <span className="text-[11px] text-amber-400 uppercase tracking-wider font-bold leading-tight">
              Stamp Duty
              <br />& STT
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 text-center leading-tight">
              Taxes
              <br />
              Paid
            </span>
          </div>
          <div className="text-xl font-extrabold text-amber-400 tracking-tight">
            {formatCurrency(summary.totalStampDuty + summary.totalStt)}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
          <span>Stamp: {formatCurrency(summary.totalStampDuty)}</span>
          <span className="text-indigo-400">
            STT: {formatCurrency(summary.totalStt)}
          </span>
        </div>
      </div>
    </div>
  );
}
