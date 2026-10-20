import UploadTrackerControls from "@/components/shared/UploadTrackerControls";
import type { UploadTrackerHeaderProps } from "@/types/upload-tracker";

export default function UploadTrackerHeader({
  reportsList,
  selectedReport,
}: UploadTrackerHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Upload Tracker</h1>
        <p className="text-sm text-slate-400 mt-1">
          Snapshot dates, source files, and missed uploads based on your upload
          schedule
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <UploadTrackerControls
          reportsList={reportsList}
          selectedReport={selectedReport}
        />
      </div>
    </div>
  );
}
