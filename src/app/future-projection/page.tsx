import { getDashboardDataAction } from "@/actions/portfolio";
import { getSipMandates, getSchemes, getReports } from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import FutureProjectionClient from "@/components/future-projection/FutureProjectionClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Future Projection — Family Portfolio",
  description: "Simulate and project your 10CR portfolio target timeline",
};

export default async function FutureProjectionPage() {
  const [dashboardData, sipMandatesList, allSchemes, reportsList] =
    await Promise.all([
      getDashboardDataAction(),
      getSipMandates(),
      getSchemes(),
      getReports(),
    ]);

  const initialPortfolioValue = dashboardData.totals.currentValue || 0;
  const initialInvestedCapital = dashboardData.totals.invested || 0;
  const portfolioXirr =
    dashboardData.totals.portfolioXirr || dashboardData.totals.cagr || 12;
  const activeSipsTotal = sipMandatesList
    .filter((s) => Boolean(s.isActive))
    .reduce((acc, s) => acc + s.monthlyAmount, 0);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport = reportsList[0] || null;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - Future Projection"
        iconName="rocket"
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <FutureProjectionClient
          initialPortfolioValue={initialPortfolioValue}
          initialInvestedCapital={initialInvestedCapital}
          initialMonthlySip={activeSipsTotal}
          initialXirr={portfolioXirr}
        />
      </main>
    </>
  );
}
