import { getSchemes } from "@/lib/portfolioService";
import { getReports } from "@/lib/portfolioService";
import MappingTab from "@/components/mutual-fund/mapping/MappingTab";
import HeaderClient from "@/components/shared/HeaderClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fund Mapping" };

export default async function MappingPage() {
  const [allSchemes, reportsList] = await Promise.all([
    getSchemes(),
    getReports(),
  ]);
  const unmappedCount = allSchemes.filter((s) => !s.schemeCodeApi).length;

  // Get latest report as selected for header display
  const selectedReport = reportsList.length > 0 ? reportsList[0] : null;

  return (
    <>
      <HeaderClient
        reportsList={reportsList}
        selectedReport={selectedReport}
        unmappedCount={unmappedCount}
      />
      <main className="flex-1 overflow-auto p-6 selection:bg-teal-500/30 selection:text-teal-200">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">Fund Mapping</h1>
          <p className="text-sm text-slate-400 mt-1">
            Map scheme names to API codes for accurate Alpha and benchmark
            calculations
          </p>
        </div>
        <MappingTab allSchemes={allSchemes} />
      </main>
    </>
  );
}
