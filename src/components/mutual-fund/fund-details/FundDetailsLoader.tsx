import { notFound, redirect } from "next/navigation";
import {
  getFundDetailsPageData,
  resolveFundPrefixRedirect,
} from "@/lib/fundDetailsService";
import FundDetailsClient from "@/components/mutual-fund/fund-details/FundDetailsClient";
import type { FundPageProps } from "@/types/fund-details";

export default async function FundDetailsLoader({
  params,
  searchParams,
}: FundPageProps) {
  const [{ id }, resolvedSearch] = await Promise.all([params, searchParams]);

  if (id.startsWith("-") || id.startsWith("sold_-")) {
    const rawDigits = id.replace(/^(sold_)?-/, "");
    const cleanNum = parseInt(rawDigits, 10);
    if (!isNaN(cleanNum)) {
      redirect(`/fund/sold_${cleanNum}`);
    }
  }

  if (id.startsWith("w_")) {
    const cleanSchemeCode = id.replace(/^w_/, "").trim();
    redirect(`/watchlist/${cleanSchemeCode}`);
  }

  if (id.startsWith("folio_") || id.startsWith("z_s")) {
    const rawClient = resolvedSearch["client"];
    const clientIdStr = Array.isArray(rawClient) ? rawClient[0] : rawClient;
    const redirectPath = await resolveFundPrefixRedirect(id, clientIdStr);
    if (redirectPath) {
      redirect(redirectPath);
    }
    notFound();
  }

  const pageData = await getFundDetailsPageData(id, resolvedSearch);
  if (!pageData) {
    notFound();
  }

  return <FundDetailsClient {...pageData} />;
}
