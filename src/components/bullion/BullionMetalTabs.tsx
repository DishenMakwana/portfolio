"use client";

import { BULLION_METALS, type BullionMetalTabsProps } from "@/types/bullion";

export default function BullionMetalTabs({
  selectedTab,
  onSelectTab,
}: BullionMetalTabsProps): React.JSX.Element {
  return (
    <div className="flex bg-slate-900/40 p-1 border border-slate-800/80 rounded-2xl max-w-sm">
      {(
        [
          BULLION_METALS.GOLD,
          BULLION_METALS.SILVER,
          BULLION_METALS.PLATINUM,
        ] as const
      ).map((tab) => {
        const isActive = selectedTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onSelectTab(tab)}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              isActive
                ? "bg-teal-500 text-slate-950 font-extrabold shadow-lg shadow-teal-500/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
