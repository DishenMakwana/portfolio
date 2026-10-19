import { formatIndianAmount } from "@/helpers/formatters";
import type { TransactionsCashflowReconciliationProps } from "@/types/transactions";

export default function TransactionsCashflowReconciliation({
  reconciliation,
}: TransactionsCashflowReconciliationProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-6">
      {/* 1. Investment (A) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
          Investment (A)
        </div>
        <div className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
          {formatIndianAmount(reconciliation.investmentA)}
        </div>
      </div>

      {/* 2. Switch In (B) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
          Switch In (B)
        </div>
        <div className="text-sm sm:text-base font-extrabold text-slate-200 tracking-tight">
          {formatIndianAmount(reconciliation.switchInB)}
        </div>
      </div>

      {/* 3. Switch Out (C) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
          Switch Out (C)
        </div>
        <div className="text-sm sm:text-base font-extrabold text-slate-200 tracking-tight">
          {formatIndianAmount(reconciliation.switchOutC)}
        </div>
      </div>

      {/* 4. Redemption (D) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 leading-tight">
          Redemption (D)
        </div>
        <div className="text-sm sm:text-base font-extrabold text-rose-400 tracking-tight">
          {formatIndianAmount(reconciliation.redemptionD)}
        </div>
      </div>

      {/* 5. Current Value (F) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-teal-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 leading-tight">
          Current Value (F)
        </div>
        <div className="text-sm sm:text-base font-extrabold text-teal-300 tracking-tight">
          {formatIndianAmount(reconciliation.currentValueF)}
        </div>
      </div>

      {/* 6. Net Gain (F-A-B+C+D) */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 leading-tight">
          Net Gain (F-A-B+C+D)
        </div>
        <div
          className={`text-sm sm:text-base font-extrabold tracking-tight ${
            reconciliation.netGain >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatIndianAmount(reconciliation.netGain)}
        </div>
      </div>

      {/* 7. Net Investment */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 leading-tight">
          Net Investment
        </div>
        <div className="text-sm sm:text-base font-extrabold text-indigo-300 tracking-tight">
          {formatIndianAmount(reconciliation.netInvestment)}
        </div>
      </div>
    </div>
  );
}
