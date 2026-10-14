import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { STATUS_META } from "@/helpers/mapping";
import type { AutoMapResultItemProps } from "@/types/mapping";

export default function AutoMapResultItem({
  result,
  isExpanded,
  onToggleExpand,
  onOpenManualModal,
  onMapScheme,
}: AutoMapResultItemProps) {
  const meta = STATUS_META[result.status];
  const Icon = meta.icon;

  return (
    <div
      className={`border ${meta.border} ${meta.bg} rounded-xl overflow-hidden`}
    >
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon size={16} className={`${meta.color} shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-200 text-sm truncate">
              {result.schemeName}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`text-xs font-bold ${meta.color}`}>
                {meta.label}
              </span>
              {result.schemeCode && (
                <span className="text-xs text-slate-400">
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
                      className={`h-full rounded-full ${
                        result.confidence >= 75
                          ? "bg-emerald-500"
                          : result.confidence >= 55
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${result.confidence}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      result.confidence >= 75
                        ? "text-emerald-400"
                        : result.confidence >= 55
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
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
              onOpenManualModal(result.schemeId, result.schemeName);
            }}
            className="text-xs text-teal-400 border border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15 font-semibold px-2.5 py-1.5 rounded-lg transition duration-150 cursor-pointer"
          >
            {result.schemeCode ? "Remap" : "Assign"}
          </button>
          {result.topMatches.length > 0 &&
            (isExpanded ? (
              <ChevronUp size={14} className="text-slate-500" />
            ) : (
              <ChevronDown size={14} className="text-slate-500" />
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
                    onMapScheme(result.schemeId, String(match.schemeCode))
                  }
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer transition border border-transparent hover:border-slate-700"
                >
                  <span className="text-xs text-slate-300">
                    {match.schemeName}
                  </span>
                  <span className="text-xs text-teal-400 font-bold ml-3 shrink-0">
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
}
