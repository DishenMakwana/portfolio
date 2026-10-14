import { motion } from "framer-motion";
import { X, Search, Loader2 } from "lucide-react";
import type { MfSearchResult } from "@/types/mf-api";
import type { ManualSearchModalProps } from "@/types/mapping";

export default function ManualSearchModal({
  isOpen,
  onClose,
  schemeId,
  schemeName,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  onSelectScheme,
}: ManualSearchModalProps) {
  if (!isOpen || schemeId === null) return null;

  return (
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
              {schemeName}
            </p>
          </div>
          <button
            onClick={onClose}
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
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              autoFocus
            />
            <Search
              className="absolute left-3.5 top-3 text-slate-500"
              size={16}
            />
            {isSearching && (
              <Loader2
                className="absolute right-3.5 top-3 text-teal-400 animate-spin"
                size={16}
              />
            )}
          </div>

          <div className="h-64 overflow-y-auto bg-slate-950 rounded-xl border border-slate-800 p-2 space-y-1">
            {isSearching ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm gap-2">
                <Loader2 size={16} className="animate-spin" /> Searching…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                {searchQuery.trim().length < 3
                  ? "Type at least 3 letters to search"
                  : "❌ No results found"}
              </div>
            ) : (
              searchResults.map((res: MfSearchResult) => (
                <div
                  key={res.schemeCode}
                  onClick={() =>
                    onSelectScheme(schemeId, String(res.schemeCode))
                  }
                  className="flex justify-between items-center p-2.5 hover:bg-slate-900 rounded-lg cursor-pointer transition border border-transparent hover:border-slate-700"
                >
                  <span className="font-medium text-slate-300 text-sm">
                    {res.schemeName}
                  </span>
                  <span className="text-teal-400 text-xs ml-4 font-bold shrink-0">
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
                  if (input?.value.trim()) {
                    onSelectScheme(schemeId, input.value.trim());
                  }
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
  );
}
