import { getDashboardDataAction } from './actions';
import { getSchemes } from '@/lib/portfolioService';
import OverviewTab from '@/components/OverviewTab';
import HeaderClient from '@/components/HeaderClient';
import { Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ reportId?: string }>;
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reportId = params.reportId ? parseInt(params.reportId, 10) : undefined;

  const data = await getDashboardDataAction(reportId);
  const allSchemes = await getSchemes();
  const unmappedCount = allSchemes.filter(s => !s.schemeCodeApi).length;

  return (
    <>
      <HeaderClient
        reportsList={data.reportsList}
        selectedReport={data.selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        {data.reportsList.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-xl mt-12">
            <Upload className="mx-auto text-teal-500 w-16 h-16 mb-4 opacity-75" />
            <h2 className="text-2xl font-bold text-slate-100 mb-2">No valuation snapshots uploaded</h2>
            <p className="text-slate-400 mb-6">
              Upload your Consolidated Portfolio Valuation Excel file to bootstrap the dashboard analytics,
              CAGR, XIRR, and Alpha comparisons.
            </p>
          </div>
        ) : (
          <OverviewTab
            totals={data.totals}
            metricDeltas={data.metricDeltas}
            timelineData={data.timelineData}
            categoryAllocation={data.categoryAllocation}
            amcAllocation={data.amcAllocation}
            capAllocation={data.capAllocation}
            memberSummaries={data.memberSummaries}
            holdings={data.holdings}
          />
        )}
      </main>
    </>
  );
}
