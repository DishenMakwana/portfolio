export interface ReportRef {
  id: number;
  asOfDate: string;
}

export interface DeleteReportButtonProps {
  reportId: number;
  dateLabel: string;
  redirectTo?: string;
  variant?: "default" | "icon";
}

export interface HeaderClientProps {
  reportsList?: ReportRef[];
  selectedReport?: ReportRef | null;
  unmappedCount: number;
}

export interface UploadTrackerControlsProps {
  reportsList: ReportRef[];
  selectedReport: ReportRef | null;
}

export interface ReportRow {
  id: number;
  asOfDate: string;
  uploadedAt: string;
  filename: string;
  cagr: number | null;
}

export interface UploadedFilesListProps {
  reportsList: ReportRow[];
}

export interface UploadTrackerPageProps {
  searchParams: Promise<{ reportId?: string; month?: string }>;
}