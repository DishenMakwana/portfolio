"use client";

import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import { formatNullableDate } from "@/helpers/formatters";
import { isUnlistedStock } from "@/lib/stockApi";
import { FundDetailsHeaderProps } from "@/types/fund-details";

export default function FundDetailsHeader({
  holding,
  isStock,
  cleanCategory,
  isRefreshingGlobal,
  onGlobalRefresh,
  onBack,
}: FundDetailsHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 p-2.5 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center shadow-md hover:scale-105 active:scale-95"
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              {holding.schemeName || "Unknown Scheme"}
            </h1>
            <span className="bg-slate-800/80 text-teal-400 border border-teal-950/60 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {cleanCategory}
            </span>
            {isUnlistedStock(holding.schemeName) && (
              <span className="bg-rose-950/80 text-rose-400 border border-rose-800/40 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Unlisted
              </span>
            )}
          </div>
          <div className="text-slate-400 mt-1.5 text-xs sm:text-sm font-medium space-y-1">
            <div>
              Holder:{" "}
              <strong className="text-slate-300">
                {holding.memberName || "Unknown Holder"}
              </strong>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {!isStock && holding.folioNo && (
                <span>
                  Folio:{" "}
                  <span className="text-slate-300 font-bold">
                    {holding.folioNo}
                  </span>
                </span>
              )}
              {holding.isin && (
                <>
                  {!isStock && holding.folioNo && (
                    <span className="text-slate-700 font-extrabold">•</span>
                  )}
                  <span>
                    ISIN:{" "}
                    <span className="text-slate-300 font-bold">
                      {holding.isin}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-sm text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl font-medium shadow-inner flex items-center gap-2">
          <Calendar size={16} className="text-teal-400" />
          <span>
            Snapshot Date:{" "}
            <strong className="text-slate-200">
              {formatNullableDate(holding.asOfDate || null)}
            </strong>
          </span>
        </div>

        <button
          onClick={onGlobalRefresh}
          disabled={isRefreshingGlobal}
          className="bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition duration-200 flex items-center gap-2 shadow-md hover:shadow-teal-950/40 disabled:opacity-50 cursor-pointer"
          title="Force refresh database & cache"
        >
          <RefreshCw
            size={14}
            className={isRefreshingGlobal ? "animate-spin" : ""}
          />
          <span>{isRefreshingGlobal ? "Refreshing..." : "Refresh Data"}</span>
        </button>
      </div>
    </header>
  );
}
