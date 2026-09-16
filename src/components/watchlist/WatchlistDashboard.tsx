"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import WatchlistHeroCards from "./WatchlistHeroCards";
import WatchlistTable from "./WatchlistTable";
import AddWatchlistModal from "./AddWatchlistModal";
import RemoveWatchlistModal from "./RemoveWatchlistModal";
import {
  removeWatchlistFundAction,
  refreshWatchlistFundAction,
} from "@/actions/watchlist";
import type { WatchlistDashboardProps, WatchlistItem } from "@/types/watchlist";

export default function WatchlistDashboard({
  initialData,
}: WatchlistDashboardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Opportunity signal filter (quick-toggled by hero card or filter modal)
  const [opportunityFilter, setOpportunityFilter] = useState<
    "ALL" | "DEEP_DIP" | "CORRECTION" | "NEAR_PEAK" | "AT_ATH"
  >("ALL");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<WatchlistItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // In-flight refresh states
  const [refreshingCodes, setRefreshingCodes] = useState<Set<string>>(
    new Set()
  );
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const existingCodes = new Set(initialData.items.map((i) => i.schemeCode));

  const handleRefreshItem = async (schemeCode: string) => {
    setRefreshingCodes((prev) => new Set(prev).add(schemeCode));
    try {
      await refreshWatchlistFundAction(schemeCode);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Failed to refresh fund:", err);
    } finally {
      setRefreshingCodes((prev) => {
        const next = new Set(prev);
        next.delete(schemeCode);
        return next;
      });
    }
  };

  const handleRefreshAll = async () => {
    if (initialData.items.length === 0 || isRefreshingAll) return;
    setIsRefreshingAll(true);
    try {
      for (const item of initialData.items) {
        setRefreshingCodes((prev) => new Set(prev).add(item.schemeCode));
        await refreshWatchlistFundAction(item.schemeCode);
        setRefreshingCodes((prev) => {
          const next = new Set(prev);
          next.delete(item.schemeCode);
          return next;
        });
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Failed to refresh all watchlist funds:", err);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleConfirmDelete = async (schemeCode: string) => {
    setIsDeleting(true);
    try {
      const res = await removeWatchlistFundAction(schemeCode);
      if (res.success) {
        setDeletingItem(null);
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err) {
      console.error("Failed to delete fund:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdded = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Top Right Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Watchlist</h1>
          <p className="text-sm text-slate-400 mt-1">
            All prospective fund radar with ATH drawdown, dip opportunities, and
            performance metrics
          </p>
        </div>

        {/* Top Right Action: Add Fund */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Fund</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <WatchlistHeroCards
        summary={initialData.summary}
        selectedOpportunityFilter={opportunityFilter}
        onSelectOpportunityFilter={(f) => setOpportunityFilter(f)}
      />

      {/* Watchlist Main Table with Search & Filter Card, Pagination, and Sorts */}
      <WatchlistTable
        items={initialData.items}
        categories={initialData.categories}
        opportunityFilter={opportunityFilter}
        onOpportunityChange={setOpportunityFilter}
        onRefreshItem={handleRefreshItem}
        onDeleteItem={(item) => setDeletingItem(item)}
        refreshingCodes={refreshingCodes}
        onOpenAddModal={() => setIsAddOpen(true)}
        onRefreshAll={handleRefreshAll}
        isRefreshingAll={isRefreshingAll}
      />

      {/* Modals */}
      <AddWatchlistModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdded={handleAdded}
        existingCodes={existingCodes}
      />

      <RemoveWatchlistModal
        isOpen={Boolean(deletingItem)}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
