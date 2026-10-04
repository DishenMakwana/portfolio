"use client";

import Image from "next/image";
import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import AnalysisLinksHeader from "./AnalysisLinksHeader";
import AnalysisLinksAddFormCard from "./AnalysisLinksAddFormCard";
import AnalysisLinksToolbar from "./AnalysisLinksToolbar";
import AnalysisLinksTableView from "./AnalysisLinksTableView";
import AnalysisLinksBentoGrid from "./AnalysisLinksBentoGrid";
import AnalysisLinksEditModal from "./AnalysisLinksEditModal";
import {
  createAnalysisLinkAction,
  updateAnalysisLinkAction,
  deleteAnalysisLinkAction,
  togglePinAnalysisLinkAction,
  scrapeLinkPreviewAction,
} from "@/actions/analysisLinks";
import type {
  AnalysisLink,
  AnalysisLinksClientProps,
  CreateAnalysisLinkInput,
  UpdateAnalysisLinkInput,
} from "@/types/analysisLinks";

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

  const initialPageSize = (() => {
    const ps = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    return !isNaN(ps) && ps > 0 ? ps : 25;
  })();
  const initialPage = (() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return !isNaN(p) && p > 0 ? p : 1;
  })();

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(initialPage);

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
        (key === "sort" && value === "newest") ||
        (key === "page" && value === "1") ||
        (key === "pageSize" && value === "25") ||
        (key === "perPage" && value === "25")
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
    const rawP = parseInt(searchParams.get("page") || "1", 10);
    if (!isNaN(rawP) && rawP > 0) setPage(rawP);
    const rawPs = parseInt(
      searchParams.get("pageSize") || searchParams.get("perPage") || "25",
      10
    );
    if (!isNaN(rawPs) && rawPs > 0) setPageSize(rawPs);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (currentQ !== searchQuery) {
        setPage(1);
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

  const totalPages = Math.ceil(filteredLinks.length / pageSize);
  const paginatedLinks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, page, pageSize]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set);
  }, [links]);

  const itemToDelete = links.find((l) => l.id === deletingLinkId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Header & Hero KPIs ── */}
      <AnalysisLinksHeader
        linksCount={links.length}
        categoriesCount={stats.totalCategories || allCategories.length}
        pinnedCount={links.filter((l) => l.pinned).length}
      />

      {/* ── Add Link Bento Card ── */}
      <AnalysisLinksAddFormCard
        urlInput={urlInput}
        onUrlInputChange={setUrlInput}
        onUrlBlur={handleUrlBlur}
        customTitle={customTitle}
        onCustomTitleChange={setCustomTitle}
        customCategory={customCategory}
        onCustomCategoryChange={setCustomCategory}
        customDescription={customDescription}
        onCustomDescriptionChange={setCustomDescription}
        showAdvancedInputs={showAdvancedInputs}
        onToggleAdvancedInputs={() =>
          setShowAdvancedInputs(!showAdvancedInputs)
        }
        isScrapingPreview={isScrapingPreview}
        isPending={isPending}
        onSubmit={handleAddLink}
      />

      {/* ── Toolbar: Search, Filters & View Toggle ── */}
      <AnalysisLinksToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedCategoryFilter={selectedCategoryFilter}
        onCategoryFilterChange={(cat) => {
          setSelectedCategoryFilter(cat);
          setPage(1);
          updateUrl({ category: cat, page: "1" });
        }}
        allCategories={allCategories}
        sortOrder={sortOrder}
        onSortOrderChange={(s) => {
          setSortOrder(s);
          setPage(1);
          updateUrl({ sort: s, page: "1" });
        }}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          updateUrl({ view: mode });
        }}
      />

      {/* ── View: Rich Table or Bento Grid ── */}
      {viewMode === "table" ? (
        <AnalysisLinksTableView
          filteredLinks={filteredLinks}
          paginatedLinks={paginatedLinks}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            updateUrl({ page: String(nextPage) });
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
            updateUrl({ pageSize: String(newSize), page: "1" });
          }}
          searchQuery={searchQuery}
          selectedCategoryFilter={selectedCategoryFilter}
          onResetFilters={() => {
            setSearchQuery("");
            setSelectedCategoryFilter("ALL");
            setPage(1);
            updateUrl({ q: null, category: null, page: "1" });
          }}
          onTogglePin={handleTogglePin}
          onCopyUrl={handleCopyUrl}
          copiedId={copiedId}
          onEdit={(link) => setEditingLink(link)}
          onDelete={(id) => setDeletingLinkId(id)}
        />
      ) : (
        <AnalysisLinksBentoGrid
          filteredLinks={filteredLinks}
          paginatedLinks={paginatedLinks}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            updateUrl({ page: String(nextPage) });
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
            updateUrl({ pageSize: String(newSize), page: "1" });
          }}
          searchQuery={searchQuery}
          selectedCategoryFilter={selectedCategoryFilter}
          onResetFilters={() => {
            setSearchQuery("");
            setSelectedCategoryFilter("ALL");
            setPage(1);
            updateUrl({ q: null, category: null, page: "1" });
          }}
          onTogglePin={handleTogglePin}
          onCopyUrl={handleCopyUrl}
          copiedId={copiedId}
          onEdit={(link) => setEditingLink(link)}
          onDelete={(id) => setDeletingLinkId(id)}
        />
      )}

      {/* ── Edit Link Modal (Portaled) ── */}
      <AnalysisLinksEditModal
        isOpen={editingLink !== null}
        link={editingLink}
        onClose={() => setEditingLink(null)}
        onUpdateLink={handleUpdateLink}
        onLinkChange={setEditingLink}
        isPending={isPending}
      />

      {/* ── Delete Confirmation Modal ── */}
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
                <Image
                  src={itemToDelete.faviconUrl}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="w-4 h-4 rounded-sm shrink-0 object-contain"
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
            <p className="text-[11px] text-slate-400 line-clamp-1 break-all">
              {itemToDelete.url}
            </p>
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
