"use client";

import { motion } from "framer-motion";
import { formatInr } from "@/helpers/formatters";
import { getAdjustedBullionPrice } from "@/helpers/bullion";
import {
  BULLION_METALS,
  type BullionMetal,
  type BullionPriceCardsProps,
} from "@/types/bullion";

function decimalsForChange(selectedTab: BullionMetal): number {
  return selectedTab === BULLION_METALS.GOLD ? 0 : 1;
}

function PriceCardItem({
  title,
  value,
  change,
  decimals,
}: {
  title: string;
  value: number;
  change: number;
  decimals: number;
}): React.JSX.Element {
  const isUp = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-lg"
    >
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="flex justify-between items-baseline gap-4 mt-2">
        <div className="text-xl font-black text-slate-100 tracking-tight">
          {formatInr(value)}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
            isUp
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          <span>
            {isUp ? "+" : ""}
            {change.toFixed(decimals)}
          </span>
          <span>{isUp ? "▲" : "▼"}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function BullionPriceCards({
  selectedTab,
  rates,
  selectedCity,
}: BullionPriceCardsProps): React.JSX.Element {
  const priceChangeDecimals = decimalsForChange(selectedTab);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {selectedTab === BULLION_METALS.GOLD && (
        <>
          <PriceCardItem
            title="24K Gold /g"
            value={getAdjustedBullionPrice(
              rates.gold["24K"],
              selectedCity.offset
            )}
            change={rates.gold.change}
            decimals={priceChangeDecimals}
          />
          <PriceCardItem
            title="22K Gold /g"
            value={getAdjustedBullionPrice(
              rates.gold["22K"],
              selectedCity.offset
            )}
            change={rates.gold.change * (22 / 24)}
            decimals={priceChangeDecimals}
          />
          <PriceCardItem
            title="18K Gold /g"
            value={getAdjustedBullionPrice(
              rates.gold["18K"],
              selectedCity.offset
            )}
            change={rates.gold.change * (18 / 24)}
            decimals={priceChangeDecimals}
          />
        </>
      )}

      {selectedTab === BULLION_METALS.SILVER && (
        <>
          <PriceCardItem
            title="999 Fine Silver /g"
            value={getAdjustedBullionPrice(
              rates.silver["999"],
              selectedCity.offset
            )}
            change={rates.silver.change}
            decimals={priceChangeDecimals}
          />
          <PriceCardItem
            title="925 Sterling Silver /g"
            value={getAdjustedBullionPrice(
              rates.silver["925"],
              selectedCity.offset
            )}
            change={rates.silver.change * 0.925}
            decimals={priceChangeDecimals}
          />
          <PriceCardItem
            title="800 Alloy Silver /g"
            value={getAdjustedBullionPrice(
              rates.silver["800"],
              selectedCity.offset
            )}
            change={rates.silver.change * 0.8}
            decimals={priceChangeDecimals}
          />
        </>
      )}

      {selectedTab === BULLION_METALS.PLATINUM && (
        <>
          <PriceCardItem
            title="PT950 Platinum /g"
            value={getAdjustedBullionPrice(
              rates.platinum["PT950"],
              selectedCity.offset
            )}
            change={rates.platinum.change}
            decimals={priceChangeDecimals}
          />
          <PriceCardItem
            title="PT900 Platinum /g"
            value={getAdjustedBullionPrice(
              rates.platinum["PT900"],
              selectedCity.offset
            )}
            change={rates.platinum.change * 0.9474}
            decimals={priceChangeDecimals}
          />
          <PriceCardItem
            title="PT850 Platinum /g"
            value={getAdjustedBullionPrice(
              rates.platinum["PT850"],
              selectedCity.offset
            )}
            change={rates.platinum.change * 0.8947}
            decimals={priceChangeDecimals}
          />
        </>
      )}
    </div>
  );
}
