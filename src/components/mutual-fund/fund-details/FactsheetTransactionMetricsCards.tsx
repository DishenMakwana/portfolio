import { TrendingUp, TrendingDown, Coins, Receipt, Scale } from "lucide-react";
import { formatCurrency } from "@/helpers/formatters";
import type { FactsheetTransactionMetricsCardsProps } from "@/types/fund-details";

export default function FactsheetTransactionMetricsCards({
  txSummary,
  balanceUnits,
}: FactsheetTransactionMetricsCardsProps) {
  const isFullySold = (balanceUnits ?? 0) <= 0.0001;

  const hasStamp = txSummary.stampDutySum > 0;
  const hasStt = txSummary.sttSum > 0;

  let stampTitle = "Stamp Duty Paid";
  let stampSubtext = "Govt stamp duty tax";

  if (hasStamp && hasStt) {
    stampTitle = "Stamp & STT Paid";
    stampSubtext = "Stamp & STT charges";
  } else if (hasStt && !hasStamp) {
    stampTitle = "STT Paid";
    stampSubtext = "Securities Tax (STT)";
  } else if (hasStamp && !hasStt) {
    stampTitle = "Stamp Duty Paid";
    stampSubtext = "Govt stamp duty tax";
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {/* Card 1: Total Buy Value */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
        <div className="flex items-center justify-between gap-1.5 h-8">
          <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Total Fund Buy
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm sm:text-base lg:text-lg font-black text-blue-400 tracking-tight whitespace-nowrap">
            {formatCurrency(txSummary.buySum)}
          </div>
          <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
            Purchases & SIP inflows
          </div>
        </div>
      </div>

      {/* Card 2: Total Sell Value */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
        <div className="flex items-center justify-between gap-1.5 h-8">
          <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Total Fund Sell
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingDown size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm sm:text-base lg:text-lg font-black text-rose-400 tracking-tight whitespace-nowrap">
            {formatCurrency(txSummary.sellSum)}
          </div>
          <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
            Redemptions & sales
          </div>
        </div>
      </div>

      {/* Card 3: Realized Capital Gains */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
        <div className="flex items-center justify-between gap-1.5 h-8">
          <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Realized Gains
          </span>
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
            <Coins size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm sm:text-base lg:text-lg font-black text-purple-400 tracking-tight whitespace-nowrap">
            {formatCurrency(txSummary.realizedCapitalGains)}
          </div>
          <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
            Profit from past sales
          </div>
        </div>
      </div>

      {/* Card 4: Dynamic Stamp Duty & STT Card */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
        <div className="flex items-center justify-between gap-1.5 h-8">
          <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            {stampTitle}
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Receipt size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm sm:text-base lg:text-lg font-black text-amber-400 tracking-tight whitespace-nowrap">
            {formatCurrency(txSummary.totalDutyAndTax)}
          </div>
          <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
            {stampSubtext}
          </div>
        </div>
      </div>

      {/* Card 5: CAS Purchase Value (Final Total Card) */}
      <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
        <div className="flex items-center justify-between gap-1.5 h-8">
          <span className="text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            CAS Purchase Val
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <Scale size={15} />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-400 tracking-tight whitespace-nowrap">
            {formatCurrency(isFullySold ? 0 : txSummary.finalTotalValuation)}
          </div>
          <div className="text-[10px] xl:text-[11px] text-slate-400/80 mt-1 font-medium whitespace-nowrap">
            {isFullySold
              ? "Fully Redeemed (0 Active Units)"
              : "Buy - Sell + Gains + Tax"}
          </div>
        </div>
      </div>
    </div>
  );
}
