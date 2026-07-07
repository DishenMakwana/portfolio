import { getSchemes, getReports } from "@/lib/portfolioService";
import { getBullionData } from "@/lib/bullionService";
import HeaderClient from "@/components/HeaderClient";
import BullionClient from "@/components/BullionClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gold & Silver — Family Portfolio" };

export default async function BullionPage() {
  const [allSchemes, reportsList, bullion] = await Promise.all([
    getSchemes(),
    getReports(),
    getBullionData(),
  ]);

  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;
  const selectedReport = reportsList[0] || null;

  return (
    <>
      <HeaderClient
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30">
        <BullionClient
          initialRates={bullion.rates}
          initialChartData={bullion.chartData}
        />
      </main>
    </>
  );
}
