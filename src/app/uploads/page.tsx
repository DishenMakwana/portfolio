import { getReports, getSchemes } from "@/lib/portfolioService";
import UploadTrackerClient from "@/components/mutual-fund/uploads/UploadTrackerClient";
import type { UploadTrackerPageProps } from "@/types/upload-tracker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload Tracker" };

export default async function UploadTrackerPage({
  searchParams,
}: UploadTrackerPageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;

  const [reportsList, allSchemes] = await Promise.all([
    getReports(),
    getSchemes(),
  ]);
  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;

  const selectedReport = reportId
    ? reportsList.find((r) => r.id === reportId) || reportsList[0]
    : reportsList[0] || null;

  return (
    <UploadTrackerClient
      reportsList={reportsList}
      selectedReport={selectedReport}
      unmappedCount={unmappedCount}
    />
  );
}
