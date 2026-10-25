import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import type {
  FactsheetAssetCompositionCardProps,
  FactsheetRawAssetAllocation,
  FactsheetAssetEntry,
  FactsheetStyleMapItem,
} from "@/types/fund-details";

export default function FactsheetAssetCompositionCard({
  factsheetMeta,
  rankingsData,
  vroPortfolio,
}: FactsheetAssetCompositionCardProps) {
  const assetEntries: FactsheetAssetEntry[] = [];

  // 1. Core Triad: Equity, Debt, Cash
  const rawAlloc =
    rankingsData?.assetAllocation ||
    (
      vroPortfolio as
        { assetAllocation?: FactsheetRawAssetAllocation } | null | undefined
    )?.assetAllocation;

  const equityVal =
    rawAlloc?.rawBreakdown?.["Equity"] ??
    rawAlloc?.equity ??
    factsheetMeta.allocation.equity ??
    0;
  const debtVal =
    rawAlloc?.rawBreakdown?.["Debt"] ??
    rawAlloc?.debt ??
    factsheetMeta.allocation.debt ??
    0;
  const cashVal =
    rawAlloc?.rawBreakdown?.["Cash"] ??
    rawAlloc?.cash ??
    factsheetMeta.allocation.other ??
    0;

  assetEntries.push({
    label: "Equity",
    value: equityVal,
    colorClass: "text-indigo-400",
    barBg: "bg-indigo-500",
  });

  assetEntries.push({
    label: "Debt",
    value: debtVal,
    colorClass: "text-sky-400",
    barBg: "bg-sky-500",
  });

  assetEntries.push({
    label: "Cash",
    value: cashVal,
    colorClass: "text-emerald-400",
    barBg: "bg-emerald-500",
  });

  // 2. Extra asset classes from rawBreakdown or others
  if (rawAlloc?.rawBreakdown) {
    const styleMap: Record<string, FactsheetStyleMapItem> = {
      "Real Estate": {
        colorClass: "text-amber-400",
        barBg: "bg-amber-500",
      },
      "Hedged Equity": {
        colorClass: "text-teal-400",
        barBg: "bg-teal-500",
      },
      Commodities: {
        colorClass: "text-yellow-400",
        barBg: "bg-yellow-500",
      },
      Commodity: {
        colorClass: "text-yellow-400",
        barBg: "bg-yellow-500",
      },
      Gold: {
        colorClass: "text-yellow-400",
        barBg: "bg-yellow-500",
      },
      Others: {
        colorClass: "text-slate-400",
        barBg: "bg-slate-500",
      },
    };

    Object.entries(rawAlloc.rawBreakdown).forEach(([key, val]) => {
      if (!["Equity", "Debt", "Cash"].includes(key) && val !== 0) {
        const styling = styleMap[key] || {
          colorClass: "text-teal-400",
          barBg: "bg-teal-500",
        };
        assetEntries.push({
          label: key,
          value: val,
          colorClass: styling.colorClass,
          barBg: styling.barBg,
        });
      }
    });
  } else if (rawAlloc?.others) {
    assetEntries.push({
      label: "Others",
      value: rawAlloc.others,
      colorClass: "text-slate-400",
      barBg: "bg-slate-500",
    });
  } else if (rankingsData?.assetAllocation) {
    if (
      rankingsData.assetAllocation.realEstate &&
      rankingsData.assetAllocation.realEstate > 0
    ) {
      assetEntries.push({
        label: "Real Estate",
        value: rankingsData.assetAllocation.realEstate,
        colorClass: "text-amber-400",
        barBg: "bg-amber-500",
      });
    }
    if (
      rankingsData.assetAllocation.commodities &&
      rankingsData.assetAllocation.commodities > 0
    ) {
      assetEntries.push({
        label: "Commodities",
        value: rankingsData.assetAllocation.commodities,
        colorClass: "text-yellow-400",
        barBg: "bg-yellow-500",
      });
    }
  } else {
    if (factsheetMeta.allocation.gold > 0) {
      assetEntries.push({
        label: "Gold",
        value: factsheetMeta.allocation.gold,
        colorClass: "text-yellow-400",
        barBg: "bg-yellow-500",
      });
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-850 transition duration-300 backdrop-blur-sm">
      <div>
        <h3 className="text-base font-black text-slate-100 mb-5 tracking-tight flex items-center gap-2 border-b border-slate-850 pb-3">
          <PieChart size={18} className="text-teal-400" />
          <span>Equity / Debt / Cash split</span>
        </h3>

        <div className="space-y-4">
          {assetEntries.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-300">{item.label}</span>
                <span className={`${item.colorClass} font-extrabold`}>
                  {item.value.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-slate-850/60">
                <motion.div
                  className={`${item.barBg} h-full rounded-full transition-all duration-500`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, Math.max(0, item.value))}%`,
                  }}
                />
              </div>
            </div>
          ))}

          {/* TAX IMPLICATION */}
          {rankingsData?.exitLoadTax?.taxImplication && (
            <div className="border-t border-slate-850 pt-3.5 mt-4 text-left">
              <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1.5">
                TAX IMPLICATION
              </span>
              <div className="text-xs text-slate-300 bg-slate-950/50 p-3 border border-slate-800/80 rounded-xl leading-relaxed">
                {rankingsData.exitLoadTax.taxImplication}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 mt-6 leading-relaxed">
        Note: Portfolio allocations are scraped from latest fund holdings and
        factsheet reports.
      </div>
    </div>
  );
}
