"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Edit3 } from "lucide-react";
import { POPULAR_CATEGORIES } from "@/constants/analysisLinks";
import type { AnalysisLinksEditModalProps } from "@/types/analysisLinks";

export default function AnalysisLinksEditModal({
  isOpen,
  link,
  onClose,
  onUpdateLink,
  onLinkChange,
  isPending,
}: AnalysisLinksEditModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen || !link) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Edit3 size={16} className="text-amber-300" />
            <span>Edit Market Link</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onUpdateLink} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              URL
            </label>
            <input
              type="text"
              value={link.url}
              onChange={(e) => onLinkChange({ ...link, url: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={link.title}
              onChange={(e) => onLinkChange({ ...link, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Category Tag
            </label>
            <select
              value={link.category}
              onChange={(e) =>
                onLinkChange({
                  ...link,
                  category: e.target.value,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50 cursor-pointer"
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
            <textarea
              value={link.description || ""}
              onChange={(e) =>
                onLinkChange({
                  ...link,
                  description: e.target.value,
                })
              }
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
