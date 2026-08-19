import {
  getAllTransactions,
  getSchemes,
  getReports,
} from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import TransactionsClient from "@/components/mutual-fund/transactions/TransactionsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transactions — Family Portfolio" };

export default async function TransactionsPage() {
  const [txRows, allSchemes, reportsList] = await Promise.all([
    getAllTransactions(),
    getSchemes(),
    getReports(),
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport = reportsList[0] || null;

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
        <TransactionsClient transactions={txRows} />
      </main>
    </>
  );
}
