import { getSchemes, getReports } from "@/lib/portfolioService";
import { getBullionData } from "@/lib/bullionService";
import HeaderClient from "@/components/shared/HeaderClient";
import BullionClient from "@/components/bullion/BullionClient";

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

  if (!bullion.success || !bullion.data) {
    throw new Error(bullion.error || "Failed to load bullion data");
  }

  return (
    <>
      <HeaderClient
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30">
        <BullionClient
          initialRates={bullion.data.rates}
          initialChartData={bullion.data.chartData}
        />
      </main>
    </>
  );
}
