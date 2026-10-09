"use client";

import {
  Sparkles,
  TrendingUp,
  Search,
  Loader2,
  Building2,
  Tag,
  Trash,
} from "lucide-react";
import type { MsflMappingModalProps } from "@/types/msfl";

export default function MsflMappingModal({
  editingScheme,
  onClose,
  stockSearchQuery,
  onStockSearch,
  onClearStockSearch,
  isSearchingStock,
  stockSearchResults,
  customTickerInput,
  onCustomTickerChange,
  onMapScheme,
  isPending,
}: MsflMappingModalProps) {
  if (!editingScheme) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-100 text-sm tracking-tight">
                Map Scheme & Benchmark
              </h3>
              <p className="text-[11px] text-teal-300/80 font-medium truncate max-w-sm mt-0.5">
                {editingScheme.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ── STOCK SEARCH VIEW ── */}
          <div className="space-y-4">
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={11} className="text-teal-400" />
                <span>Search Stock Tickers (NSE & BSE)</span>
              </label>

              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search stock symbol or name (e.g. ASHOKLEY, RELIANCE, TCS)..."
                  value={stockSearchQuery}
                  onChange={(e) => onStockSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition"
                  autoFocus
                />
                {isSearchingStock ? (
                  <Loader2
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 animate-spin"
                    size={14}
                  />
                ) : stockSearchQuery ? (
                  <button
                    onClick={onClearStockSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] transition cursor-pointer"
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {/* Stock Search Results Panel */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-850/60 shadow-inner">
                {isSearchingStock ? (
                  <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                    <Loader2 size={14} className="animate-spin text-teal-400" />
                    Searching Yahoo Finance stock symbols…
                  </div>
                ) : stockSearchResults.length > 0 ? (
                  stockSearchResults.map((res) => {
                    const isIndian =
                      res.symbol.endsWith(".NS") ||
                      res.symbol.endsWith(".BO") ||
                      res.exchange.includes("NSE") ||
                      res.exchange.includes("BSE") ||
                      res.exchange.includes("Bombay");

                    return (
                      <div
                        key={res.symbol}
                        onClick={() => onMapScheme(res.symbol)}
                        className="flex items-center justify-between p-3 hover:bg-slate-900/90 cursor-pointer transition text-xs group"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="font-bold text-slate-200 group-hover:text-teal-300 transition truncate flex items-center gap-1.5">
                            <span>{res.name}</span>
                            {isIndian && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                                India
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Building2 size={10} />
                              {res.exchange}
                            </span>
                            {res.industry && <span>• {res.industry}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs  font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg group-hover:bg-teal-500/20 group-hover:border-teal-500/40 transition">
                            {res.symbol}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-7 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                    <span>
                      {stockSearchQuery.trim().length < 2
                        ? "Type stock symbol to search NSE/BSE tickers…"
                        : "No ticker matches found on Yahoo Finance."}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Ticker Entry with Quick Helper Pills */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag size={11} className="text-teal-400" />
                  <span>Manual Ticker Entry</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const base = customTickerInput
                        .replace(/\.(NS|BO)/gi, "")
                        .trim();
                      onCustomTickerChange(`${base}.NS`);
                    }}
                    className="text-[10px] font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    + .NS (NSE)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = customTickerInput
                        .replace(/\.(NS|BO)/gi, "")
                        .trim();
                      onCustomTickerChange(`${base}.BO`);
                    }}
                    className="text-[10px] font-bold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    + .BO (BSE)
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.G. ASHOKLEY.NS, 539574.BO"
                  value={customTickerInput}
                  onChange={(e) =>
                    onCustomTickerChange(e.target.value.toUpperCase())
                  }
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/20 rounded-xl px-3.5 py-2 text-xs  text-slate-200 outline-none transition uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTickerInput.trim()) {
                      onMapScheme(customTickerInput.trim().toUpperCase());
                    }
                  }}
                  disabled={!customTickerInput.trim() || isPending}
                  className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shrink-0 shadow-md shadow-teal-500/20"
                >
                  Apply Ticker
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-950/80">
          {editingScheme.schemeCodeApi ? (
            <button
              type="button"
              onClick={() => onMapScheme(null)}
              disabled={isPending}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash size={12} />
              <span>Clear Mapping</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
