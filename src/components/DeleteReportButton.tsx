"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteReportAction } from "@/app/actions";

interface DeleteReportButtonProps {
  reportId: number;
  dateLabel: string;
  redirectTo?: string;
  variant?: "default" | "icon";
}

export default function DeleteReportButton({
  reportId,
  dateLabel,
  redirectTo,
  variant = "default",
}: DeleteReportButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent propagation if nested in a clickable element
    if (!confirm(`Delete uploaded XLSX snapshot for ${dateLabel}?`)) return;

    startTransition(async () => {
      const res = await deleteReportAction(reportId);
      if (!res.success) {
        alert(res.error || "Failed to delete");
        return;
      }

      router.refresh();
      if (redirectTo) {
        router.push(redirectTo);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      title={`Delete ${dateLabel}`}
      className={
        variant === "icon"
          ? "p-1 rounded bg-red-500/25 hover:bg-red-500/40 text-red-300 hover:text-red-100 transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
          : "inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
      }
    >
      <Trash2 size={variant === "icon" ? 12 : 13} />
      {variant !== "icon" && (isPending ? "Deleting" : "Delete")}
    </button>
  );
}
