import { getSipMandates, getSchemes, getReports } from "@/lib/portfolioService";
import HeaderClient from "@/components/shared/HeaderClient";
import SipsClient from "@/components/mutual-fund/sips/SipsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My SIPs — Family Portfolio" };

export default async function SipsPage() {
  const [mandates, allSchemes, reportsList] = await Promise.all([
    getSipMandates(),
    getSchemes(),
    getReports(),
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
        <SipsClient mandates={mandates} />
      </main>
    </>
  );
}
