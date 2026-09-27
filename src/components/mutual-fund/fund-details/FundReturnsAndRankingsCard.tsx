"use client";

import { useState, useMemo } from "react";
import { RotateCw, Info, Award, CheckCircle2 } from "lucide-react";
import { refreshSchemeCategoryRankingAction } from "@/actions/fundRankings";
import { isCacheFresh } from "@/helpers/dates";
import type {
  FundReturnsAndRankingsCardProps,
  SchemeCategoryRankingsData,
} from "@/types/fund-details";
import toast from "react-hot-toast";

export default function FundReturnsAndRankingsCard({
  schemeCode,
  schemeName,
  categoryName,
  initialRankingsData,
  onDataUpdated,
}: FundReturnsAndRankingsCardProps) {
  const [activeTab, setActiveTab] = useState<"annualised" | "absolute">(
    "annualised"
  );
  const [data, setData] = useState<SchemeCategoryRankingsData | null>(
    initialRankingsData
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isFresh = isCacheFresh(data?.lastScrapedAt);

  const handleRefresh = async () => {
    if (isRefreshing || !schemeCode) return;
    setIsRefreshing(true);
    const toastId = toast.loading(
      "Scraping latest Groww returns, ratios & holdings..."
    );
    try {
      const res = await refreshSchemeCategoryRankingAction(schemeCode);
      if (res.success && res.data) {
        setData(res.data);
        if (onDataUpdated) {
          onDataUpdated(res.data);
        }
        toast.success("Groww data synced successfully!", {
          id: toastId,
        });
      } else {
        toast.error(res.error || "Failed to update data", { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${msg}`, { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentTable =
    activeTab === "annualised" ? data?.annualised : data?.absolute;
  const horizons = useMemo(() => {
    const raw = currentTable?.horizons || ["3Y", "5Y", "10Y", "All"];
    return Array.from(new Set(raw));
  }, [currentTable?.horizons]);
  const displayCategory =
    data?.categoryName || categoryName || "Equity Flexi Cap";

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Award size={18} className="text-teal-400" />
            <h3 className="text-base font-black text-slate-100 tracking-tight">
              Returns and rankings
            </h3>
            <div
              className="text-slate-400 hover:text-slate-300 transition-colors cursor-help"
              title="Industry-wide mutual fund category peer ranking and benchmark returns from Groww"
            >
              <Info size={14} />
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {displayCategory}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Live peer comparison against the full mutual fund category universe
          </p>
        </div>

        {/* Right side Actions: Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 transition-all hover:text-teal-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={
              isFresh
                ? `Data is fresh (24h TTL / synced today). Click to force refresh from Groww.`
                : "Data is stale (>24h or prior calendar day). Click to sync latest Groww data."
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isFresh
                  ? "bg-emerald-400 shadow-xs shadow-emerald-500/50"
                  : "bg-amber-400"
              }`}
            />
            <RotateCw
              size={13}
              className={`text-teal-400 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Scraping..." : "Sync Groww Data"}</span>
          </button>
        </div>
      </div>

      {/* Pill Switcher */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={() => setActiveTab("annualised")}
          className={`px-3.5 py-1.5 rounded-lg text-xs transition-all ${
            activeTab === "annualised"
              ? "bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold shadow-xs"
              : "bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-800/50 font-medium"
          }`}
        >
          Annualised returns
        </button>
        <button
          onClick={() => setActiveTab("absolute")}
          className={`px-3.5 py-1.5 rounded-lg text-xs transition-all ${
            activeTab === "absolute"
              ? "bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold shadow-xs"
              : "bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:bg-slate-800/50 font-medium"
          }`}
        >
          Absolute returns
        </button>
      </div>

      {/* Table Content */}
      {currentTable ? (
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4 min-w-[200px]">Name</th>
                {horizons.map((h, idx) => (
                  <th
                    key={`th-col-${h}-${idx}`}
                    className="py-3 px-4 text-right min-w-[90px]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {/* Row 1: Fund returns */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-200">
                  <div className="flex flex-col gap-0.5 max-w-[260px] sm:max-w-sm">
                    <span className="text-slate-100">Fund returns</span>
                    {schemeName && (
                      <span className="text-[11px] text-teal-400/90 font-normal leading-snug break-words">
                        ({schemeName})
                      </span>
                    )}
                  </div>
                </td>
                {horizons.map((h, idx) => {
                  const val = currentTable.fundReturns[h] || "--";
                  const isPositive = val.startsWith("+");
                  return (
                    <td
                      key={`fund-ret-${h}-${idx}`}
                      className={`py-3.5 px-4 text-right font-bold tracking-tight text-sm ${
                        val === "--"
                          ? "text-slate-500"
                          : isPositive
                            ? "text-emerald-400"
                            : "text-rose-400"
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Category average */}
              <tr className="hover:bg-slate-800/30 transition-colors bg-slate-900/20">
                <td className="py-3.5 px-4 text-slate-300 font-medium">
                  <div className="flex flex-col gap-0.5 max-w-[260px] sm:max-w-sm">
                    <span className="text-slate-200">Category average</span>
                    <span className="text-[11px] text-slate-400 font-normal leading-snug break-words">
                      ({displayCategory})
                    </span>
                  </div>
                </td>
                {horizons.map((h, idx) => {
                  const val = currentTable.categoryAvg[h] || "--";
                  const isPositive = val.startsWith("+");
                  return (
                    <td
                      key={`cat-avg-${h}-${idx}`}
                      className={`py-3.5 px-4 text-right font-semibold text-sm ${
                        val === "--"
                          ? "text-slate-500"
                          : isPositive
                            ? "text-emerald-400/90"
                            : "text-rose-400/90"
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Category Rank in Blue */}
              <tr className="hover:bg-slate-800/30 transition-colors bg-blue-950/10">
                <td className="py-3.5 px-4 font-bold text-blue-300">
                  <div className="flex items-center gap-1.5">
                    <Award size={14} className="text-blue-400 shrink-0" />
                    <span>Rank ({displayCategory})</span>
                  </div>
                </td>
                {horizons.map((h, idx) => {
                  const rankVal = currentTable.categoryRank[h] || "--";
                  const isRankValid = rankVal !== "--" && rankVal !== "";
                  return (
                    <td
                      key={`cat-rank-${h}-${idx}`}
                      className="py-3.5 px-4 text-right font-bold"
                    >
                      {isRankValid ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black shadow-xs">
                          #{rankVal}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-normal text-sm">
                          --
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/20 space-y-3">
          <p className="text-xs text-slate-400">
            No cached Groww category returns and rankings found for this fund.
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-xs font-bold text-teal-300 transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCw
              size={13}
              className={`text-teal-400 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>
              {isRefreshing ? "Scraping Data..." : "Fetch from Groww"}
            </span>
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 gap-1.5">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-teal-400/70" />
          <span>Source: Groww Peer Category Benchmarks & Rankings</span>
        </div>
        {data?.lastScrapedAt && (
          <span>
            Last synced: {new Date(data.lastScrapedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
