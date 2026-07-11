"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Loader2,
  X,
  Link as LinkIcon,
  CheckCircle,
} from "lucide-react";
import { searchMfApiAction } from "@/app/actions";
import {
  updateZerodhaSchemeMappingAction,
  autoMapAllZerodhaSchemesAction,
  updateZerodhaSchemeCategoryAction,
} from "@/app/zerodha/actions";

interface ZerodhaScheme {
  id: number;
  name: string;
  category: string;
  schemeCodeApi: string | null;
}

interface ZerodhaMappingTabProps {
  allSchemes: ZerodhaScheme[];
}

const isStockScheme = (scheme: ZerodhaScheme) => {
  if (scheme.category.toLowerCase().includes("stock")) return true;
  if (
    scheme.schemeCodeApi &&
    (scheme.schemeCodeApi.includes(".") || isNaN(Number(scheme.schemeCodeApi)))
  )
    return true;
  return !scheme.name.includes(" ");
};

export default function ZerodhaMappingTab({
  allSchemes,
}: ZerodhaMappingTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Filter & Search states
  const [mappingFilter, setMappingFilter] = useState<
    "all" | "mapped" | "unmapped"
  >("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<
    "all" | "mf" | "stocks"
  >("all");
  const [localSearch, setLocalSearch] = useState("");

  // Manual Mapping Modal
  const [mappingSchemeId, setMappingSchemeId] = useState<number | null>(null);
  const [mappingSchemeName, setMappingSchemeName] = useState("");
  const [apiSearchQuery, setApiSearchQuery] = useState("");
  const [apiSearchResults, setApiSearchResults] = useState<
    import("@/lib/mfApi").MfSearchResult[]
  >([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // Auto-map state
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const handleApiSearch = async (query: string) => {
    setApiSearchQuery(query);
    if (query.trim().length < 3) {
      setApiSearchResults([]);
      return;
    }
    setIsSearchingApi(true);
    try {
      const results = await searchMfApiAction(query);
      setApiSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleMapScheme = async (schemeId: number, code: string | null) => {
    startTransition(async () => {
      await updateZerodhaSchemeMappingAction(schemeId, code);
      setMappingSchemeId(null);
      setApiSearchQuery("");
      setApiSearchResults([]);
      router.refresh();
    });
  };

  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    try {
      await autoMapAllZerodhaSchemesAction(true);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAutoMapping(false);
    }
  };

  // Filter schemes list
  const filteredSchemes = allSchemes.filter((scheme) => {
    const matchesSearch = scheme.name
      .toLowerCase()
      .includes(localSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (mappingFilter === "mapped" && !scheme.schemeCodeApi) return false;
    if (mappingFilter === "unmapped" && scheme.schemeCodeApi) return false;

    const isStock = isStockScheme(scheme);
    if (assetTypeFilter === "mf" && isStock) return false;
    if (assetTypeFilter === "stocks" && !isStock) return false;

    return true;
  });

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const mappedCount = allSchemes.filter((s) => !!s.schemeCodeApi).length;

  return (
    <div className="space-y-6">
      {/* Overview stats panel */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Zerodha Scheme Mappings
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
            Link each personal mutual fund to its AMFI scheme code to enable
            historical NAV rendering, alpha benchmarks, and volatility
            calculations.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
              <ShieldCheck size={12} /> {mappedCount} Mapped
            </span>
            <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
              <AlertTriangle size={12} /> {unmappedCount} Unmapped
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-800 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
              Total: {allSchemes.length} Funds
            </span>
          </div>
        </div>

        <button
          onClick={handleAutoMapAll}
          disabled={isAutoMapping || unmappedCount === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition duration-200 shrink-0 text-xs self-start sm:self-center"
        >
          {isAutoMapping ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Matching…
            </>
          ) : (
            <>
              <Zap size={14} /> Auto-Fetch Codes ({unmappedCount} unmapped)
            </>
          )}
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800/60 p-1 rounded-xl w-full md:w-auto">
            {(["all", "mapped", "unmapped"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMappingFilter(tab)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition duration-150 cursor-pointer ${
                  mappingFilter === tab
                    ? "bg-slate-800 text-slate-100 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab === "all" ? "All Status" : tab}
              </button>
            ))}
          </div>

          {/* Asset Type Filter */}
          <div className="flex gap-1.5 bg-slate-950/80 border border-slate-800/60 p-1 rounded-xl w-full md:w-auto">
            {(["all", "mf", "stocks"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setAssetTypeFilter(type)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition duration-150 cursor-pointer ${
                  assetTypeFilter === type
                    ? "bg-slate-800 text-slate-100 shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {type === "all"
                  ? "All Assets"
                  : type === "mf"
                    ? "Mutual Funds"
                    : "Stocks"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            placeholder="Search local schemes..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800/80 hover:border-slate-800 focus:border-teal-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* Schemes mapping list */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Scheme Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">API Mapping Code</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium">
              {filteredSchemes.length > 0 ? (
                filteredSchemes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/10 transition">
                    <td
                      className="py-3.5 px-4 font-bold text-slate-200 max-w-sm truncate"
                      title={s.name}
                    >
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 capitalize">
                      {s.category}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.schemeCodeApi ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                          <CheckCircle size={12} />
                          {s.schemeCodeApi}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                          <AlertTriangle size={12} />
                          Unmapped
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setMappingSchemeId(s.id);
                          setMappingSchemeName(s.name);
                          handleApiSearch(s.name);
                        }}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-md px-2.5 py-1 transition cursor-pointer"
                      >
                        <LinkIcon size={10} />
                        {s.schemeCodeApi ? "Change Map" : "Map Fund"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    No mutual funds found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Search Modal */}
      <AnimatePresence>
        {mappingSchemeId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
                <h3 className="font-bold text-slate-100 text-sm">
                  Map Scheme Code
                </h3>
                <button
                  onClick={() => {
                    setMappingSchemeId(null);
                    setApiSearchQuery("");
                    setApiSearchResults([]);
                  }}
                  className="text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Scheme Name
                  </span>
                  <div className="text-xs text-slate-200 font-bold break-words">
                    {mappingSchemeName}
                  </div>
                </div>

                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Search AMFI API (e.g. Parag Parikh Flexi)..."
                    value={apiSearchQuery}
                    onChange={(e) => handleApiSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 outline-none transition"
                  />
                </div>

                {/* Manual Ticker Entry for Stocks or Custom Indices */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Or Enter Custom Yahoo Ticker (e.g., 539574.BO, RELIANCE.NS)
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code (e.g. 539574.BO)"
                      id="custom-ticker-input"
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none transition uppercase"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "custom-ticker-input"
                        ) as HTMLInputElement;
                        if (input && input.value.trim()) {
                          handleMapScheme(
                            mappingSchemeId!,
                            input.value.trim().toUpperCase()
                          );
                        }
                      }}
                      className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    >
                      Apply Code
                    </button>
                  </div>
                </div>

                {/* Classification Category for Benchmark */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Choose Classification (for Benchmark Index selection)
                  </span>
                  <div className="flex gap-2">
                    <select
                      id="custom-category-select"
                      defaultValue={
                        allSchemes.find((s) => s.id === mappingSchemeId)
                          ?.category || "Equity Stock"
                      }
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none transition"
                    >
                      <option value="Equity: Large Cap">
                        Large Cap (Nifty 50)
                      </option>
                      <option value="Equity: Mid Cap">
                        Mid Cap (Nifty Midcap 150)
                      </option>
                      <option value="Equity: Small Cap">
                        Small Cap (Nifty Smallcap 250)
                      </option>
                      <option value="Debt">Debt (Fixed Income)</option>
                      <option value="Mutual Fund">Other / Mutual Fund</option>
                    </select>
                    <button
                      onClick={async () => {
                        const select = document.getElementById(
                          "custom-category-select"
                        ) as HTMLSelectElement;
                        if (select) {
                          startTransition(async () => {
                            await updateZerodhaSchemeCategoryAction(
                              mappingSchemeId!,
                              select.value
                            );
                            router.refresh();
                          });
                        }
                      }}
                      className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer"
                    >
                      Apply Class
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Search Results
                  </span>

                  <div className="bg-slate-950/60 border border-slate-850 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-900">
                    {isSearchingApi ? (
                      <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
                        <Loader2
                          size={14}
                          className="animate-spin text-teal-400"
                        />
                        Searching API...
                      </div>
                    ) : apiSearchResults.length > 0 ? (
                      apiSearchResults.map(
                        (res: import("@/lib/mfApi").MfSearchResult) => (
                          <div
                            key={res.schemeCode}
                            onClick={() =>
                              handleMapScheme(
                                mappingSchemeId,
                                String(res.schemeCode)
                              )
                            }
                            className="flex items-center justify-between p-3 hover:bg-slate-900 cursor-pointer transition text-xs"
                          >
                            <div className="font-bold text-slate-300 flex-1 pr-4 leading-normal">
                              {res.schemeName}
                            </div>
                            <div className="font-mono text-[10px] font-bold text-teal-400 shrink-0">
                              {res.schemeCode}
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      <div className="py-10 text-center text-slate-500 text-xs">
                        {apiSearchQuery.trim().length < 3
                          ? "Type at least 3 characters to search..."
                          : "No matches found on api.mfapi.in"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => handleMapScheme(mappingSchemeId, null)}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition cursor-pointer"
                >
                  Unmap Scheme
                </button>
                <button
                  onClick={() => {
                    setMappingSchemeId(null);
                    setApiSearchQuery("");
                    setApiSearchResults([]);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
