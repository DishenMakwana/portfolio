"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { globalRefreshAction } from "@/actions/portfolio";
import type { HeaderClientProps } from "@/types/upload-tracker";

function MappingLink({ unmappedCount }: { unmappedCount: number }) {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  return (
    <Link
      href={
        reportId ? { pathname: "/mapping", query: { reportId } } : "/mapping"
      }
      className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 transition"
    >
      <AlertTriangle size={12} />
      {unmappedCount} unmapped funds
    </Link>
  );
}

export default function HeaderClient({ unmappedCount }: HeaderClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = async (): Promise<void> => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await globalRefreshAction();
      if (!res.success) {
        alert(res.error || "Failed to refresh global cache");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to connect to server";
      alert("Error: " + errorMsg);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-400 font-medium">
            Family Portfolio
          </div>
          {unmappedCount > 0 && (
            <Suspense
              fallback={
                <div className="h-6 w-32 bg-slate-800/20 animate-pulse rounded-lg" />
              }
            >
              <MappingLink unmappedCount={unmappedCount} />
            </Suspense>
          )}
        </div>

        <button
          onClick={handleGlobalRefresh}
          disabled={isRefreshing}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 hover:text-indigo-400 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 shadow-md ${
            isRefreshing ? "text-indigo-400" : ""
          }`}
          title="Force refresh entire portfolio caches (live fetch for all items)"
        >
          <RefreshCw
            size={12}
            className={isRefreshing ? "animate-spin text-indigo-400" : ""}
          />
          <span>
            {isRefreshing ? "Refreshing Caches..." : "Refresh Caches"}
          </span>
        </button>
      </header>
    </>
  );
}
