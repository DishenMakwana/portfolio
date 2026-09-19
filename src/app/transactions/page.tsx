import { Suspense } from "react";
import {
  getAllTransactions,
  getSchemes,
  getReports,
  getReportHoldings,
} from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import TransactionsClient from "@/components/mutual-fund/transactions/TransactionsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transactions — Family Portfolio" };

export default async function TransactionsPage() {
  const reportsListPromise = getReports();
  const holdingsPromise = reportsListPromise.then((reports) =>
    reports[0] ? getReportHoldings(reports[0].id) : Promise.resolve([])
  );

  const [txRows, allSchemes, reportsList, holdings] = await Promise.all([
    getAllTransactions(),
    getSchemes(),
    reportsListPromise,
    holdingsPromise,
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport = reportsList[0] || null;
  const currentPortfolioValue = holdings.reduce(
    (acc, h) => acc + (h.currentValue || 0),
    0
  );

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Transactions"
        iconName="arrow-left-right"
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">
            All mutual fund purchase and sell transaction entries
          </p>
        </div>
        <Suspense fallback={null}>
          <TransactionsClient
            transactions={txRows}
            currentPortfolioValue={currentPortfolioValue}
          />
        </Suspense>
      </main>
    </>
  );
}
