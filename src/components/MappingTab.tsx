"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import {
  searchMfApiAction,
  updateSchemeMappingAction,
  autoMapAllSchemesAction,
} from "@/actions/portfolio";
import { AutoMapResult } from "@/types/portfolio";
import { MappingTabProps } from "@/types/mapping";
import { MfSearchResult } from "@/types/mf-api";

const STATUS_META: Record<
  AutoMapResult["status"],
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  mapped: {
    label: "Auto-Mapped",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  low_confidence: {
    label: "Low Confidence",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: HelpCircle,
  },
  not_found: {
    label: "Not Found",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: XCircle,
  },
  already_mapped: {
    label: "Already Mapped",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    icon: ShieldCheck,
  },
  api_error: {
    label: "API Error",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    icon: AlertTriangle,
  },
};

export default function MappingTab({ allSchemes }: MappingTabProps) {
  const router = useRouter();

  // ── Filter state
  const [mappingFilter, setMappingFilter] = useState<
    "all" | "mapped" | "unmapped"
  >("all");

  // ── Manual assign modal state
  const [mappingSchemeId, setMappingSchemeId] = useState<number | null>(null);
  const [mappingSchemeName, setMappingSchemeName] = useState("");
  const [apiSearchQuery, setApiSearchQuery] = useState("");
  const [apiSearchResults, setApiSearchResults] = useState<MfSearchResult[]>(
    []
  );
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // ── Auto-map state
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [autoMapResults, setAutoMapResults] = useState<AutoMapResult[] | null>(
    null
  );

  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [autoMapFilter, setAutoMapFilter] = useState<
    "all" | "mapped" | "low_confidence" | "not_found"
  >("all");

  // ── Search for the manual modal
  const handleApiSearch = async (query: string) => {
    setApiSearchQuery(query);
    if (query.trim().length < 3) {
      setApiSearchResults([]);
      return;
    }
    setIsSearchingApi(true);
    const results = await searchMfApiAction(query);
    setApiSearchResults(results);
    setIsSearchingApi(false);
  };

  const handleMapScheme = async (schemeId: number, code: string | null) => {
    await updateSchemeMappingAction(schemeId, code);
    setMappingSchemeId(null);
    setApiSearchQuery("");
    setApiSearchResults([]);
    // If there's an auto-map result panel open, refresh the result too
    if (autoMapResults) {
      setAutoMapResults((prev) =>
        prev
          ? prev.map((r) =>
              r.schemeId === schemeId
                ? {
                    ...r,
                    status: code ? "mapped" : "not_found",
                    schemeCode: code,
                    confidence: code ? 100 : null,
                  }
                : r
            )
          : null
      );
    }
    router.refresh();
  };

  // ── Auto-map all unmapped schemes
  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    setAutoMapResults(null);
    setAutoMapFilter("all");
    try {
      const { results } = await autoMapAllSchemesAction(true);
      setAutoMapResults(results);
    } finally {
      setIsAutoMapping(false);
      router.refresh();
    }
  };

  const filteredSchemes = allSchemes.filter((scheme) => {
    if (mappingFilter === "mapped") return !!scheme.schemeCodeApi;
    if (mappingFilter === "unmapped") return !scheme.schemeCodeApi;
    return true;
  });

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const mappedCount = allSchemes.filter((s) => !!s.schemeCodeApi).length;

  // Filter the auto-map result list
  const filteredAutoResults = autoMapResults
    ? autoMapResults.filter((r) => {
        if (autoMapFilter === "all") return true;
        if (autoMapFilter === "mapped")
          return r.status === "mapped" || r.status === "already_mapped";
        if (autoMapFilter === "low_confidence")
          return r.status === "low_confidence";
        if (autoMapFilter === "not_found")
          return r.status === "not_found" || r.status === "api_error";
        return true;
      })
    : null;

  return (
    <motion.div
      key="mapping"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* ── HEADER PANEL ── */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h3 className="text-xl font-bold text-slate-100">
              Scheme API Mappings
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Link each fund to its{" "}
              <span className="font-mono text-teal-400">api.mfapi.in</span>{" "}
              scheme code for live NAV, XIRR, and Alpha calculations.
            </p>
          </div>
          <button
            onClick={handleAutoMapAll}
            disabled={isAutoMapping || unmappedCount === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg cursor-pointer transition duration-200 shrink-0"
          >
            {isAutoMapping ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Auto-fetching…
              </>
            ) : (
              <>
                <Zap size={16} /> Auto-Fetch All ({unmappedCount} unmapped)
              </>
            )}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={13} /> {mappedCount} Mapped
          </div>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-400">
            <AlertTriangle size={13} /> {unmappedCount} Unmapped
          </div>
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400">
            Total: {allSchemes.length} schemes
          </div>
        </div>
      </div>

      {/* ── AUTO-MAP RESULTS PANEL ── */}
      <AnimatePresence>
        {(isAutoMapping || autoMapResults) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <Zap size={18} className="text-teal-400" />
                Auto-Fetch Results
              </h4>
              {autoMapResults && (
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-emerald-400">
                    {autoMapResults.filter((r) => r.status === "mapped").length}{" "}
                    auto-saved
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-amber-400">
                    {
                      autoMapResults.filter(
                        (r) => r.status === "low_confidence"
                      ).length
                    }{" "}
                    need review
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-red-400">
                    {
                      autoMapResults.filter(
                        (r) =>
                          r.status === "not_found" || r.status === "api_error"
                      ).length
                    }{" "}
                    not found
                  </span>
                </div>
              )}
            </div>

            {isAutoMapping && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={36} className="text-teal-400 animate-spin" />
                <p className="text-slate-400 text-sm">
                  Querying api.mfapi.in for each scheme… this may take a moment.
                </p>
              </div>
            )}

            {autoMapResults && (
              <>
                {/* Result filter pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(
                    ["all", "mapped", "low_confidence", "not_found"] as const
                  ).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAutoMapFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition duration-200 cursor-pointer ${
                        autoMapFilter === f
                          ? "bg-teal-500 text-slate-950 border-teal-500"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {f === "all" && `All (${autoMapResults.length})`}
                      {f === "mapped" &&
                        `✅ Mapped (${autoMapResults.filter((r) => r.status === "mapped" || r.status === "already_mapped").length})`}
                      {f === "low_confidence" &&
                        `⚠️ Low Confidence (${autoMapResults.filter((r) => r.status === "low_confidence").length})`}
                      {f === "not_found" &&
                        `❌ Not Found (${autoMapResults.filter((r) => r.status === "not_found" || r.status === "api_error").length})`}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {filteredAutoResults?.map((result) => {
                    const meta = STATUS_META[result.status];
                    const Icon = meta.icon;
                    const isExpanded = expandedResult === result.schemeId;

                    return (
                      <div
                        key={result.schemeId}
                        className={`border ${meta.border} ${meta.bg} rounded-xl overflow-hidden`}
                      >
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer"
                          onClick={() =>
                            setExpandedResult(
                              isExpanded ? null : result.schemeId
                            )
                          }
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Icon
                              size={16}
                              className={`${meta.color} shrink-0 mt-0.5`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-200 text-sm truncate">
                                {result.schemeName}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span
                                  className={`text-xs font-bold ${meta.color}`}
                                >
                                  {meta.label}
                                </span>
                                {result.schemeCode && (
                                  <span className="text-xs font-mono text-slate-400">
                                    Code:{" "}
                                    <span className="text-teal-400 font-bold">
                                      {result.schemeCode}
                                    </span>
                                  </span>
                                )}
                                {result.confidence !== null && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <motion.div
                                        className={`h-full rounded-full ${result.confidence >= 75 ? "bg-emerald-500" : result.confidence >= 55 ? "bg-amber-500" : "bg-red-500"}`}
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${result.confidence}%`,
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`text-xs font-semibold ${result.confidence >= 75 ? "text-emerald-400" : result.confidence >= 55 ? "text-amber-400" : "text-red-400"}`}
                                    >
                                      {result.confidence}% conf.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* Quick re-assign */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMappingSchemeId(result.schemeId);
                                setMappingSchemeName(result.schemeName);
                                const q = result.schemeName
                                  .replace(/Reg(?:ular)?/gi, "")
                                  .replace(/\(G\)/g, "")
                                  .trim()
                                  .slice(0, 30);
                                setApiSearchQuery(q);
                                handleApiSearch(q);
                              }}
                              className="text-xs text-teal-400 border border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15 font-semibold px-2.5 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                            >
                              {result.schemeCode ? "Remap" : "Assign"}
                            </button>
                            {result.topMatches.length > 0 &&
                              (isExpanded ? (
                                <ChevronUp
                                  size={14}
                                  className="text-slate-500"
                                />
                              ) : (
                                <ChevronDown
                                  size={14}
                                  className="text-slate-500"
                                />
                              ))}
                          </div>
                        </div>

                        {/* Expandable: top API matches */}
                        <AnimatePresence>
                          {isExpanded && result.topMatches.length > 0 && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-slate-800/60 px-3 pb-3 pt-2 space-y-1">
                                <p className="text-xs text-slate-500 font-semibold mb-1.5">
                                  Top API matches — click to apply:
                                </p>
                                {result.topMatches.map((match) => (
                                  <div
                                    key={match.schemeCode}
                                    onClick={() =>
                                      handleMapScheme(
                                        result.schemeId,
                                        String(match.schemeCode)
                                      )
                                    }
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition border border-transparent hover:border-slate-700"
                                  >
                                    <span className="text-xs text-slate-300">
                                      {match.schemeName}
                                    </span>
                                    <span className="text-xs text-teal-400 font-mono font-bold ml-3 shrink-0">
                                      {match.schemeCode}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCHEME LIST PANEL ── */}
      <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-100">All Schemes</h4>
          {/* Filter pills */}
          <div className="flex gap-2">
            {(["all", "mapped", "unmapped"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMappingFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition duration-200 cursor-pointer ${
                  mappingFilter === f
                    ? "bg-teal-500 text-slate-950 border-teal-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {f === "all" && `All (${allSchemes.length})`}
                {f === "mapped" && `Mapped (${mappedCount})`}
                {f === "unmapped" && `Unmapped (${unmappedCount})`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredSchemes.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              No schemes match the &ldquo;{mappingFilter}&rdquo; filter.
            </div>
          ) : (
            filteredSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950/40 border border-slate-800 rounded-xl gap-3 hover:border-slate-700 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 text-sm">
                    {scheme.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      {scheme.category}
                    </span>
                    {scheme.schemeCodeApi ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <ShieldCheck size={12} />
                        Code:{" "}
                        <span className="font-mono">
                          {scheme.schemeCodeApi}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500 font-semibold">
                        <AlertTriangle size={12} /> Not mapped
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {scheme.schemeCodeApi && (
                    <button
                      onClick={() => handleMapScheme(scheme.id, null)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-1.5 border border-red-800/40 bg-red-950/20 hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMappingSchemeId(scheme.id);
                      setMappingSchemeName(scheme.name);
                      const q = scheme.name
                        .replace(/Reg(?:ular)?/gi, "")
                        .replace(/\(G\)/g, "")
                        .trim()
                        .slice(0, 30);
                      setApiSearchQuery(q);
                      handleApiSearch(q);
                    }}
                    className="text-xs text-slate-950 bg-teal-400 hover:bg-teal-300 font-bold px-4 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    {scheme.schemeCodeApi ? "Remap" : "Assign Code"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MANUAL SEARCH MODAL ── */}
      {mappingSchemeId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-800 flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg text-slate-100">
                  Search Scheme Code
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md line-clamp-2">
                  {mappingSchemeName}
                </p>
              </div>
              <button
                onClick={() => {
                  setMappingSchemeId(null);
                  setApiSearchQuery("");
                  setApiSearchResults([]);
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-center p-1 rounded hover:bg-slate-800 transition mt-0.5"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type scheme name (e.g. Aditya Birla Flexi)…"
                  value={apiSearchQuery}
                  onChange={(e) => handleApiSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  autoFocus
                />
                <Search
                  className="absolute left-3.5 top-3 text-slate-500"
                  size={16}
                />
                {isSearchingApi && (
                  <Loader2
                    className="absolute right-3.5 top-3 text-teal-400 animate-spin"
                    size={16}
                  />
                )}
              </div>

              <div className="h-64 overflow-y-auto bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1">
                {isSearchingApi ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm gap-2">
                    <Loader2 size={16} className="animate-spin" /> Searching…
                  </div>
                ) : apiSearchResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    {apiSearchQuery.trim().length < 3
                      ? "Type at least 3 letters to search"
                      : "❌ No results found"}
                  </div>
                ) : (
                  apiSearchResults.map((res: MfSearchResult) => (
                    <div
                      key={res.schemeCode}
                      onClick={() =>
                        handleMapScheme(mappingSchemeId, String(res.schemeCode))
                      }
                      className="flex justify-between items-center p-2.5 hover:bg-slate-900 rounded-lg cursor-pointer transition border border-transparent hover:border-slate-700"
                    >
                      <span className="font-medium text-slate-300 text-sm">
                        {res.schemeName}
                      </span>
                      <span className="text-teal-400 font-mono text-xs ml-4 font-bold shrink-0">
                        #{res.schemeCode}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Manual code entry */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-slate-800">
                <span className="text-slate-400 text-xs shrink-0 font-medium">
                  Enter code directly:
                </span>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 120716"
                    id="manualCodeInput"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 flex-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(
                        "manualCodeInput"
                      ) as HTMLInputElement;
                      if (input?.value.trim())
                        handleMapScheme(mappingSchemeId, input.value.trim());
                    }}
                    className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
