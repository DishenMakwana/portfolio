import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2 } from "lucide-react";
import AutoMapResultItem from "./AutoMapResultItem";
import type { AutoMapResultsPanelProps } from "@/types/mapping";

export default function AutoMapResultsPanel({
  isAutoMapping,
  autoMapResults,
  filteredAutoResults,
  autoMapFilter,
  onAutoMapFilterChange,
  expandedResult,
  onToggleExpandResult,
  onOpenManualModal,
  onMapScheme,
}: AutoMapResultsPanelProps) {
  return (
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
                    autoMapResults.filter((r) => r.status === "low_confidence")
                      .length
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
                    onClick={() => onAutoMapFilterChange(f)}
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
                {filteredAutoResults?.map((result) => (
                  <AutoMapResultItem
                    key={result.schemeId}
                    result={result}
                    isExpanded={expandedResult === result.schemeId}
                    onToggleExpand={() =>
                      onToggleExpandResult(
                        expandedResult === result.schemeId ? 0 : result.schemeId
                      )
                    }
                    onOpenManualModal={onOpenManualModal}
                    onMapScheme={onMapScheme}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
