"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Copy,
  Check,
  Globe,
  Sparkles,
  Link2,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Loader2,
  FolderOpen,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  AnalysisLink,
  AnalysisLinksStats,
  CreateAnalysisLinkInput,
  UpdateAnalysisLinkInput,
} from "@/types/analysisLinks";
import {
  createAnalysisLinkAction,
  updateAnalysisLinkAction,
  deleteAnalysisLinkAction,
  togglePinAnalysisLinkAction,
  scrapeLinkPreviewAction,
} from "@/actions/analysisLinks";
import { createPortal } from "react-dom";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

interface AnalysisLinksClientProps {
  initialLinks: AnalysisLink[];
  stats: AnalysisLinksStats;
}

const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Fundamental: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-500/20",
  },
  Technical: {
    bg: "bg-sky-500/10",
    text: "text-sky-300",
    border: "border-sky-500/20",
  },
  Macro: {
    bg: "bg-purple-500/10",
    text: "text-purple-300",
    border: "border-purple-500/20",
  },
  Valuation: {
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    border: "border-amber-500/20",
  },
  News: {
    bg: "bg-rose-500/10",
    text: "text-rose-300",
    border: "border-rose-500/20",
  },
  General: {
    bg: "bg-slate-500/10",
    text: "text-slate-300",
    border: "border-slate-500/20",
  },
};

const POPULAR_CATEGORIES = [
  "General",
  "Fundamental",
  "Technical",
  "Macro",
  "Valuation",
  "News",
  "Smallcap Ideas",
  "Sector Trends",
];

export default function AnalysisLinksClient({
  initialLinks,
  stats,
}: AnalysisLinksClientProps): React.JSX.Element {
  const [links, setLinks] = useState<AnalysisLink[]>(initialLinks);
  const [urlInput, setUrlInput] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState("General");
  const [customDescription, setCustomDescription] = useState("");
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") || ""
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(
    () => searchParams.get("category") || "ALL"
  );
  const [viewMode, setViewMode] = useState<"table" | "bento">(
    () => (searchParams.get("view") as "table" | "bento") || "table"
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">(
    () =>
      (searchParams.get("sort") as "newest" | "oldest" | "title") || "newest"
  );

  const updateUrl = (updates: Record<string, string | null>) => {
    const searchString =
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString();
    const current = new URLSearchParams(searchString);
    for (const [key, value] of Object.entries(updates)) {
      if (
        value === null ||
        value === "" ||
        value === "ALL" ||
        (key === "view" && value === "table") ||
        (key === "sort" && value === "newest")
      ) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const query = current.toString();
    const url = `${pathname}${query ? `?${query}` : ""}`;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    setSelectedCategoryFilter(searchParams.get("category") || "ALL");
    setViewMode((searchParams.get("view") as "table" | "bento") || "table");
    setSortOrder(
      (searchParams.get("sort") as "newest" | "oldest" | "title") || "newest"
    );
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (currentQ !== searchQuery) {
        updateUrl({ q: searchQuery });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Transitions & Loading states
  const [isPending, startTransition] = useTransition();
  const [isScrapingPreview, setIsScrapingPreview] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modals state
  const [editingLink, setEditingLink] = useState<AnalysisLink | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<number | null>(null);

  // Auto-fetch title preview when URL is pasted
  const handleUrlBlur = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed || customTitle) return;

    setIsScrapingPreview(true);
    try {
      const res = await scrapeLinkPreviewAction(trimmed);
      if (res.success && res.data) {
        setCustomTitle(res.data.title);
        if (!customDescription && res.data.description) {
          setCustomDescription(res.data.description);
        }
      }
    } catch {
      // Ignore preview errors silently
    } finally {
      setIsScrapingPreview(false);
    }
  };

  // Add Link Submit
  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    startTransition(async () => {
      const payload: CreateAnalysisLinkInput = {
        url: urlInput.trim(),
        title: customTitle.trim() || undefined,
        description: customDescription.trim() || undefined,
        category: customCategory.trim() || "General",
      };

      const res = await createAnalysisLinkAction(payload);
      if (res.success && res.data) {
        setLinks((prev) => [res.data!, ...prev]);
        setUrlInput("");
        setCustomTitle("");
        setCustomDescription("");
        setCustomCategory("General");
        setShowAdvancedInputs(false);
        toast.success("Market link saved successfully!");
      } else {
        toast.error(res.error || "Failed to add link");
      }
    });
  };

  // Delete Link
  const handleConfirmDelete = async () => {
    if (!deletingLinkId) return;
    startTransition(async () => {
      const res = await deleteAnalysisLinkAction(deletingLinkId);
      if (res.success) {
        setLinks((prev) => prev.filter((l) => l.id !== deletingLinkId));
        setDeletingLinkId(null);
        toast.success("Link deleted");
      } else {
        toast.error(res.error || "Failed to delete link");
      }
    });
  };

  // Update Link
  const handleUpdateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;

    startTransition(async () => {
      const payload: UpdateAnalysisLinkInput = {
        id: editingLink.id,
        url: editingLink.url,
        title: editingLink.title,
        description: editingLink.description || "",
        category: editingLink.category,
      };

      const res = await updateAnalysisLinkAction(payload);
      if (res.success && res.data) {
        setLinks((prev) =>
          prev.map((l) => (l.id === editingLink.id ? res.data! : l))
        );
        setEditingLink(null);
        toast.success("Link updated");
      } else {
        toast.error(res.error || "Failed to update link");
      }
    });
  };

  // Pin / Unpin
  const handleTogglePin = async (link: AnalysisLink) => {
    startTransition(async () => {
      const res = await togglePinAnalysisLinkAction(link.id, link.pinned);
      if (res.success && res.data) {
        setLinks((prev) =>
          prev
            .map((l) => (l.id === link.id ? res.data! : l))
            .sort((a, b) => b.pinned - a.pinned)
        );
        toast.success(link.pinned ? "Unpinned from top" : "Pinned to top");
      }
    });
  };

  // Copy Link
  const handleCopyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort Links
  const filteredLinks = useMemo(() => {
    let result = [...links];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.domain.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          l.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategoryFilter !== "ALL") {
      result = result.filter((l) => l.category === selectedCategoryFilter);
    }

    result.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return b.pinned - a.pinned;
      }
      if (sortOrder === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortOrder === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [links, searchQuery, selectedCategoryFilter, sortOrder]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set);
  }, [links]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header & Hero KPIs ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 shrink-0">
              <Globe size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                Market Analysis & Intelligence Links
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Centralized hub for research resources, stock screeners, macro
                insights, and charting tools.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
            <Link2 size={15} className="text-sky-300" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Total Links
              </span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {links.length}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
            <FolderOpen size={15} className="text-emerald-300" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Categories
              </span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {stats.totalCategories || allCategories.length}
              </span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
            <Pin size={15} className="text-amber-200" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Pinned
              </span>
              <span className="text-sm font-bold text-slate-100 tabular-nums">
                {links.filter((l) => l.pinned).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Link Bento Card (Dribbble/Pinterest Inspired) ── */}
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
            onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
            className="text-xs font-medium text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Tag size={13} />
            <span>
              {showAdvancedInputs ? "Simple Mode" : "Custom Title & Tags"}
            </span>
          </button>
        </div>

        <form onSubmit={handleAddLink} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onBlur={handleUrlBlur}
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
                    onChange={(e) => setCustomTitle(e.target.value)}
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
                    onChange={(e) => setCustomCategory(e.target.value)}
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
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Quick thesis or key points..."
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* ── Toolbar: Search, Filters & View Toggle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <SearchFilterBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search title, URL, domain, or notes..."
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                const cat = e.target.value;
                setSelectedCategoryFilter(cat);
                updateUrl({ category: cat });
              }}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <ArrowUpDown size={13} className="text-slate-400" />
            <select
              value={sortOrder}
              onChange={(e) => {
                const s = e.target.value as "newest" | "oldest" | "title";
                setSortOrder(s);
                updateUrl({ sort: s });
              }}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                updateUrl({ view: "table" });
              }}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("bento");
                updateUrl({ view: "bento" });
              }}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "bento"
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="Bento Grid View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── View 1: Rich Table View ── */}
      {viewMode === "table" ? (
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-3 w-10 text-center">Pin</th>
                  <th className="py-3.5 px-3 w-12 text-center text-slate-500 font-mono">
                    #
                  </th>
                  <th className="py-3.5 px-4">Title & Source</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">URL / Domain</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLinks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-slate-500"
                    >
                      <Globe size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-slate-400">
                        No market links found
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Paste a URL above to save your first market research
                        resource.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((link, idx) => {
                    const catStyle =
                      CATEGORY_COLORS[link.category] || CATEGORY_COLORS.General;
                    return (
                      <tr
                        key={link.id}
                        className={`hover:bg-slate-800/40 transition-colors group ${
                          link.pinned ? "bg-amber-500/[0.02]" : ""
                        }`}
                      >
                        {/* Pin Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(link)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              link.pinned
                                ? "text-amber-300 hover:text-amber-200"
                                : "text-slate-600 hover:text-slate-400"
                            }`}
                            title={link.pinned ? "Unpin" : "Pin to top"}
                          >
                            <Pin
                              size={14}
                              className={link.pinned ? "fill-amber-300" : ""}
                            />
                          </button>
                        </td>

                        {/* Index Count # (starts with 1) */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono text-xs font-semibold text-slate-500 group-hover:text-slate-300 tabular-nums transition-colors">
                            {idx + 1}
                          </span>
                        </td>

                        {/* Title, Favicon & Full URL */}
                        <td className="py-3 px-4 max-w-sm sm:max-w-md">
                          <div className="flex items-start gap-2.5">
                            {link.faviconUrl ? (
                              <img
                                src={link.faviconUrl}
                                alt=""
                                className="w-4 h-4 rounded-sm shrink-0 mt-0.5"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <Globe
                                size={14}
                                className="text-slate-500 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="flex flex-col min-w-0">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-slate-100 hover:text-sky-300 transition-colors inline-flex items-center gap-1 line-clamp-1 group-hover:underline text-xs sm:text-sm"
                              >
                                <span>{link.title}</span>
                                <ExternalLink
                                  size={11}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-sky-300"
                                />
                              </a>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-slate-400 hover:text-sky-300 transition-colors font-mono line-clamp-1 break-all mt-0.5"
                              >
                                {link.url}
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Category Tag */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-md border text-[11px] font-semibold inline-block ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {link.category}
                          </span>
                        </td>

                        {/* Domain / Copy URL */}
                        <td className="py-3 px-4 text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-slate-300">
                              {link.domain}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUrl(link.id, link.url)}
                              className="p-1 text-slate-500 hover:text-sky-300 transition-colors rounded cursor-pointer"
                              title="Copy URL"
                            >
                              {copiedId === link.id ? (
                                <Check size={12} className="text-emerald-300" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Notes / Description */}
                        <td className="py-3 px-4 text-slate-400 max-w-xs">
                          <p className="line-clamp-1 text-[11px]">
                            {link.description || "—"}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              type="button"
                              onClick={() => setEditingLink(link)}
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit link"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingLinkId(link.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete link"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── View 2: Bento Grid Cards (Pinterest / Dribbble Style) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLinks.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <Globe size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-slate-400">
                No market links found
              </p>
            </div>
          ) : (
            filteredLinks.map((link, idx) => {
              const catStyle =
                CATEGORY_COLORS[link.category] || CATEGORY_COLORS.General;
              return (
                <div
                  key={link.id}
                  className={`bg-slate-900/70 backdrop-blur-md border ${
                    link.pinned
                      ? "border-amber-500/40 shadow-amber-500/5"
                      : "border-slate-800/80"
                  } hover:border-sky-500/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-md group relative`}
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {link.faviconUrl ? (
                          <img
                            src={link.faviconUrl}
                            alt=""
                            className="w-4 h-4 rounded-sm shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Globe
                            size={14}
                            className="text-slate-500 shrink-0"
                          />
                        )}
                        <span className="text-[11px] font-mono text-slate-400">
                          {link.domain}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(link)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            link.pinned
                              ? "text-amber-300"
                              : "text-slate-600 hover:text-slate-400"
                          }`}
                        >
                          <Pin
                            size={13}
                            className={link.pinned ? "fill-amber-300" : ""}
                          />
                        </button>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-950/60 border border-slate-800/80 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {link.category}
                        </span>
                      </div>
                    </div>

                    {/* Card Title */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2 mb-1 block"
                    >
                      {link.title}
                    </a>

                    {/* Card Full URL */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-sky-300 font-mono line-clamp-1 break-all mb-2 block transition-colors"
                    >
                      {link.url}
                    </a>

                    {/* Card Description */}
                    {link.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {link.description}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom Row */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500 mt-2">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(link.id, link.url)}
                      className="hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === link.id ? (
                        <>
                          <Check size={12} className="text-emerald-300" />
                          <span className="text-emerald-300 text-[11px]">
                            Copied
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingLink(link)}
                        className="p-1 hover:text-amber-300 transition-colors cursor-pointer"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLinkId(link.id)}
                        className="p-1 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-sky-300 hover:text-sky-200 transition-colors ml-1"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Edit Link Modal (Portaled) ── */}
      {typeof document !== "undefined" &&
        editingLink &&
        createPortal(
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
                  onClick={() => setEditingLink(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateLink} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    URL
                  </label>
                  <input
                    type="text"
                    value={editingLink.url}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, url: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingLink.title}
                    onChange={(e) =>
                      setEditingLink({ ...editingLink, title: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={editingLink.category}
                    onChange={(e) =>
                      setEditingLink({
                        ...editingLink,
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
                    value={editingLink.description || ""}
                    onChange={(e) =>
                      setEditingLink({
                        ...editingLink,
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
                    onClick={() => setEditingLink(null)}
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
        )}

      {/* ── Delete Confirmation Modal ── */}
      {(() => {
        const itemToDelete = links.find((l) => l.id === deletingLinkId);
        return (
          <ConfirmationModal
            isOpen={deletingLinkId !== null}
            onClose={() => setDeletingLinkId(null)}
            onConfirm={handleConfirmDelete}
            title="Delete Market Link?"
            description="Are you sure you want to remove this link? This action is permanent and cannot be undone."
            confirmText="Delete Link"
            cancelText="Cancel"
            variant="danger"
            isPending={isPending}
          >
            {itemToDelete && (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 my-2 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  {itemToDelete.faviconUrl ? (
                    <img
                      src={itemToDelete.faviconUrl}
                      alt=""
                      className="w-4 h-4 rounded-sm shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Globe size={14} className="text-slate-500 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-200 line-clamp-1">
                    {itemToDelete.title}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 line-clamp-1 break-all">
                  {itemToDelete.url}
                </p>
              </div>
            )}
          </ConfirmationModal>
        );
      })()}
    </div>
  );
}
