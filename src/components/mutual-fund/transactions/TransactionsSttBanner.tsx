import { motion } from "framer-motion";
import { Info, ShieldAlert } from "lucide-react";
import type { TransactionsSttBannerProps } from "@/types/transactions";

export default function TransactionsSttBanner({
  showSttInfo,
  onToggleSttInfo,
}: TransactionsSttBannerProps) {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-slate-900/60 backdrop-blur-md p-4 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
            <Info className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                Securities Transaction Tax (STT) & Tax Applicability
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Tax Regulation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              <strong className="text-slate-200">What is STT?</strong>{" "}
              Securities Transaction Tax (STT) is a direct tax levied by the
              Central Government of India on mutual fund transactions.
            </p>
            {showSttInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Redemptions / Sells (Equity Funds)
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Levied at{" "}
                      <strong className="text-slate-200">0.001%</strong> on the
                      redemption proceeds when selling or switching out of{" "}
                      <strong className="text-slate-200">
                        Equity-oriented mutual funds
                      </strong>{" "}
                      (≥ 65% equity allocation). Automatically deducted upfront
                      by AMC.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <div className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Purchases & Non-Equity Schemes
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      <strong className="text-slate-200">
                        Purchases/SIPs:
                      </strong>{" "}
                      Exempt from STT (attracts 0.005% Stamp Duty instead).{" "}
                      <br />
                      <strong className="text-slate-200">
                        Debt & Liquid Funds:
                      </strong>{" "}
                      Completely exempt from STT.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleSttInfo}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap cursor-pointer"
        >
          {showSttInfo ? "Hide Details" : "Learn More"}
        </button>
      </div>
    </div>
  );
}
