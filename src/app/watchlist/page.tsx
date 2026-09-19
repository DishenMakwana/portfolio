import { Suspense } from "react";
import { getWatchlistDashboardData } from "@/lib/watchlistService";
import { getSchemes, getReports } from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import WatchlistDashboard from "@/components/watchlist/WatchlistDashboard";
import type {
  WatchlistPageProps,
  WatchlistAssetTypeFilter,
} from "@/types/watchlist";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mutual Fund Watchlist & ATH Opportunities — Portfolio",
};

function parseServerAssetType(val?: string | null): WatchlistAssetTypeFilter {
  const raw = (val || "").toUpperCase();
  if (raw === "MUTUAL_FUND" || raw === "MF") return "MUTUAL_FUND";
  if (raw === "STOCK" || raw === "STOCKS") return "STOCK";
  if (raw === "ETF" || raw === "ETFS") return "ETF";
  return "ALL";
}

export default async function WatchlistPage({
  searchParams,
}: WatchlistPageProps) {
  const params = await searchParams;
  const initialType = parseServerAssetType(params?.type);

  const [watchlistData, reportsList, allSchemes] = await Promise.all([
    getWatchlistDashboardData(),
    getReports(),
    getSchemes(),
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport = reportsList[0] || null;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Watchlist"
        iconName="bookmark"
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <Suspense fallback={null}>
          <WatchlistDashboard
            initialData={watchlistData}
            initialType={initialType}
          />
        </Suspense>
      </main>
    </>
  );
}
