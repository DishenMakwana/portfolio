"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface HeaderClientProps {
  reportsList?: { id: number; asOfDate: string }[];
  selectedReport?: { id: number; asOfDate: string } | null;
  unmappedCount: number;
}

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
      </header>
    </>
  );
}
