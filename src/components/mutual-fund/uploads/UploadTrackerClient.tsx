"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { uploadReportAction } from "@/actions/portfolio";
import HeaderClient from "@/components/shared/HeaderClient";
import { startOfMonth } from "@/helpers/dates";
import { computeUploadTrackerTimeline } from "@/helpers/uploadTracker";
import UploadTrackerCalendarCard from "./calendar/UploadTrackerCalendarCard";
import UploadHoldingsDropzoneCard from "./cards/UploadHoldingsDropzoneCard";
import UploadTrackerMissedDatesCard from "./cards/UploadTrackerMissedDatesCard";
import UploadedXlsxFilesCard from "./cards/UploadedXlsxFilesCard";
import UploadTrackerHeader from "./UploadTrackerHeader";
import UploadTrackerMetricCards from "./UploadTrackerMetricCards";
import type { UploadTrackerClientProps } from "@/types/upload-tracker";

export default function UploadTrackerClient({
  reportsList,
  selectedReport,
  unmappedCount,
  firstCasReportDate,
}: UploadTrackerClientProps) {
  const router = useRouter();

  const {
    reportByDate,
    today,
    firstReportDate,
    lastExpectedSnapshotDate,
    months,
    missedDays,
  } = computeUploadTrackerTimeline(reportsList, firstCasReportDate);

  const [activeMonth, setActiveMonth] = useState(() => {
    return startOfMonth(months.at(-1) || today);
  });

  const activeMonthIndex = months.findIndex(
    (m) =>
      m.getFullYear() === activeMonth.getFullYear() &&
      m.getMonth() === activeMonth.getMonth()
  );
  const prevMonth = activeMonthIndex > 0 ? months[activeMonthIndex - 1] : null;
  const nextMonth =
    activeMonthIndex !== -1 && activeMonthIndex < months.length - 1
      ? months[activeMonthIndex + 1]
      : null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading valuation statement...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadReportAction(formData);
      if (res.success && res.data?.reportId) {
        toast.success("Mutual Fund Valuation sheet uploaded successfully!", {
          id: toastId,
        });
        router.refresh();
        router.push(`/uploads?reportId=${res.data.reportId}`);
      } else {
        toast.error(res.error || "Failed to parse upload file", {
          id: toastId,
        });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload error occurred",
        { id: toastId }
      );
    }
    e.target.value = "";
  };

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Upload Tracker"
        iconName="calendar-days"
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200 space-y-6">
        {/* Page Title & Controls Header */}
        <UploadTrackerHeader
          reportsList={reportsList}
          selectedReport={selectedReport}
        />

        {/* ── METRIC CARDS ── */}
        <UploadTrackerMetricCards
          totalSnapshots={reportsList.length}
          uploadedDaysCount={reportByDate.size}
          missedDaysCount={missedDays.length}
          latestReport={reportsList[0] || null}
        />

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          {/* Calendar Card */}
          <UploadTrackerCalendarCard
            reportsCount={reportsList.length}
            activeMonth={activeMonth}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
            onPrevMonth={() =>
              prevMonth && setActiveMonth(startOfMonth(prevMonth))
            }
            onNextMonth={() =>
              nextMonth && setActiveMonth(startOfMonth(nextMonth))
            }
            reportByDate={reportByDate}
            firstReportDate={firstReportDate}
            lastExpectedSnapshotDate={lastExpectedSnapshotDate}
          />

          {/* Upload Card + Uploaded Files List */}
          <div className="space-y-6">
            <UploadHoldingsDropzoneCard onFileUpload={handleFileUpload} />
            <UploadedXlsxFilesCard reportsList={reportsList} />
          </div>
        </div>

        {/* ── MISSED DATES CARD (FULL WIDTH) ── */}
        <UploadTrackerMissedDatesCard missedDays={missedDays} />
      </main>
    </>
  );
}
