import { redirect } from "next/navigation";
import type { FutureProjectionPageProps } from "@/types/futureProjection";

export default async function FutureProjectionPage({
  searchParams,
}: FutureProjectionPageProps) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  sp.set("tab", "future-projection");
  for (const [k, v] of Object.entries(params || {})) {
    if (k !== "tab" && typeof v === "string") {
      sp.set(k, v);
    }
  }
  redirect(`/insights?${sp.toString()}`);
}
