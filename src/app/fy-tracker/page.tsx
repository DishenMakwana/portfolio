import { redirect } from "next/navigation";
import type { FyTrackerPageProps } from "@/types/insights";

export default async function FyTrackerPage({
  searchParams,
}: FyTrackerPageProps) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  sp.set("tab", "fy-tracker");
  if (params?.fy) {
    sp.set("fy", params.fy);
  }
  if (params?.metric) {
    sp.set("metric", params.metric);
  }
  redirect(`/insights?${sp.toString()}`);
}
