import HeaderClient from "@/components/shared/HeaderClient";
import BankDepositDashboardClient from "@/components/bank-deposit/BankDepositDashboardClient";
import { getBankDepositDashboardData } from "@/lib/bankDepositService";
import { getCurrentFinancialYearAndMonth } from "@/helpers/bankDeposit";
import type { BankDepositsPageProps } from "@/types/bankDeposit";

export default async function BankDepositLoader({
  searchParams,
}: BankDepositsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const currentMeta = getCurrentFinancialYearAndMonth();
  const financialYear = resolvedParams.fy || currentMeta.financialYear;
  const month = resolvedParams.month
    ? parseInt(resolvedParams.month, 10)
    : null;
  const depositData = await getBankDepositDashboardData(financialYear, month);

  return (
    <>
      <HeaderClient
        title="Bank Deposit Management"
        iconName="landmark"
        badge={
          <span className="text-[11px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md">
            FY {depositData.financialYear} • {depositData.persons.length}{" "}
            Persons • {depositData.transactions.length} Deposits
          </span>
        }
      />
      <main className="flex-1 flex flex-col overflow-auto p-4 sm:p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <BankDepositDashboardClient initialData={depositData} />
      </main>
    </>
  );
}
