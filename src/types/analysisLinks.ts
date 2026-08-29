export interface AnalysisLink {
  id: number;
  url: string;
  title: string;
  description: string | null;
  domain: string;
  faviconUrl: string | null;
  category: string;
  pinned: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAnalysisLinkInput {
  url: string;
  title?: string;
  description?: string;
  category?: string;
  pinned?: number;
}

export interface UpdateAnalysisLinkInput {
  id: number;
  url?: string;
  title?: string;
  description?: string;
  category?: string;
  pinned?: number;
}

export interface ScrapedLinkMetadata {
  url: string;
  title: string;
  description: string;
  domain: string;
  faviconUrl: string;
}

export interface AnalysisLinksPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export interface AnalysisLinksStats {
  totalLinks: number;
  totalCategories: number;
  topDomains: { domain: string; count: number }[];
  pinnedCount: number;
}
