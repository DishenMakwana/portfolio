import { redirect } from "next/navigation";
import type { NiftyAnalysisPageProps } from "@/types/nifty-analysis";

export default async function NiftyAnalysisPage({
  searchParams,
}: NiftyAnalysisPageProps) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  sp.set("tab", "nifty-trajectory");
  if (params?.reportId) {
    sp.set("reportId", params.reportId);
  }
  redirect(`/insights?${sp.toString()}`);
}
