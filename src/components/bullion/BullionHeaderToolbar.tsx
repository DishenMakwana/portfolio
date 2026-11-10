"use client";

import { useState, useRef } from "react";
import { Coins, RefreshCw, Calendar, ChevronDown } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import { CITIES } from "@/helpers/bullion";
import type { BullionHeaderToolbarProps } from "@/types/bullion";

export default function BullionHeaderToolbar({
  asOfDate,
  selectedCity,
  isRefreshing,
  onRefresh,
  onSelectCity,
}: BullionHeaderToolbarProps): React.JSX.Element {
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    cityDropdownRef,
    () => setIsCityDropdownOpen(false),
    isCityDropdownOpen
  );

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/30 border border-slate-800/40 p-4 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
          <Coins size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            Live Precious Metals Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Track and calculate current retail bullion prices in India
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh live prices"
          title="Refresh live prices"
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-300 hover:border-slate-700 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            size={16}
            className={`text-teal-400 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>

        {/* Date Stamp */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-300">
          <Calendar size={16} className="text-teal-400" />
          <span>{asOfDate}</span>
        </div>

        {/* City Selector Dropdown */}
        <div ref={cityDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
            className="flex items-center justify-between gap-2 min-w-36 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 hover:border-slate-700 hover:text-white transition cursor-pointer shadow-inner"
          >
            <span>{selectedCity.name}</span>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${isCityDropdownOpen ? "rotate-180 text-teal-400" : ""}`}
            />
          </button>
          {isCityDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-20 w-full min-w-[160px] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 overflow-hidden backdrop-blur-xl">
              {CITIES.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => {
                    onSelectCity(city);
                    setIsCityDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-slate-800/80 transition cursor-pointer ${
                    selectedCity.id === city.id
                      ? "text-teal-400 bg-teal-500/10 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {city.name}{" "}
                  {city.offset !== 0
                    ? `(${city.offset > 0 ? "+" : ""}${(city.offset * 100).toFixed(2)}%)`
                    : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
