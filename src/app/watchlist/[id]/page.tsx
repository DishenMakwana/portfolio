import { notFound } from "next/navigation";
import { getWatchlistFullDetails } from "@/lib/watchlistService";
import WatchlistDetailsClient from "@/components/watchlist/details/WatchlistDetailsClient";
import type { Metadata } from "next";
import type { WatchlistDetailsPageProps } from "@/types/watchlist";

export async function generateMetadata({
  params,
}: WatchlistDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const cleanId = id.replace(/^w_/, "").trim();
  const fund = await getWatchlistFullDetails(cleanId);

  if (!fund) {
    return {
      title: "Watchlist Scheme Not Found | Portfolio",
    };
  }

  return {
    title: `${fund.schemeName} | Watchlist Analytics`,
    description: `Detailed risk, return over time, and portfolio insights for ${fund.schemeName}`,
  };
}

export default async function WatchlistDetailsPage({
  params,
}: WatchlistDetailsPageProps) {
  const { id } = await params;
  const cleanId = id.replace(/^w_/, "").trim();
  const fund = await getWatchlistFullDetails(cleanId);

  if (!fund) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <WatchlistDetailsClient initialFund={fund} />
      </div>
    </div>
  );
}
