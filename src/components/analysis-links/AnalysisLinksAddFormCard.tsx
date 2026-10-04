"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Tag, Loader2, Sparkles } from "lucide-react";
import { POPULAR_CATEGORIES } from "@/constants/analysisLinks";
import type { AnalysisLinksAddFormCardProps } from "@/types/analysisLinks";

export default function AnalysisLinksAddFormCard({
  urlInput,
  onUrlInputChange,
  onUrlBlur,
  customTitle,
  onCustomTitleChange,
  customCategory,
  onCustomCategoryChange,
  customDescription,
  onCustomDescriptionChange,
  showAdvancedInputs,
  onToggleAdvancedInputs,
  isScrapingPreview,
  isPending,
  onSubmit,
}: AnalysisLinksAddFormCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">
            <Plus size={16} />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100">
              Add Market Research Link
            </h2>
            <p className="text-xs text-slate-400">
              Paste any link (Screener, TradingView, ValueResearch, News) &
              title will be extracted automatically.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleAdvancedInputs}
          className="text-xs font-medium text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Tag size={13} />
          <span>
            {showAdvancedInputs ? "Simple Mode" : "Custom Title & Tags"}
          </span>
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => onUrlInputChange(e.target.value)}
              onBlur={onUrlBlur}
              placeholder="Paste URL here (e.g. https://www.screener.in/company/INFY/)"
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all pr-10"
              disabled={isPending}
            />
            {isScrapingPreview && (
              <div className="absolute right-3 top-3.5 text-sky-300 animate-spin">
                <Loader2 size={16} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !urlInput.trim()}
            className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Save Link</span>
              </>
            )}
          </button>
        </div>

        {/* Advanced / Optional Inputs */}
        <AnimatePresence>
          {(showAdvancedInputs || customTitle) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => onCustomTitleChange(e.target.value)}
                  placeholder="Auto-extracted if left empty"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Category Tag
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => onCustomCategoryChange(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50 cursor-pointer"
                >
                  {POPULAR_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => onCustomDescriptionChange(e.target.value)}
                  placeholder="Quick thesis or key points..."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
