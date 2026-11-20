import { getPortfolioAuditData } from "@/lib/auditService";
import { getReports } from "@/lib/portfolioService";
import AuditClient from "@/components/mutual-fund/audit/AuditClient";
import HeaderClient from "@/components/shared/HeaderClient";

export default async function AuditLoader() {
  const reportsListPromise = getReports();
  const auditPromise = reportsListPromise.then((reps) =>
    getPortfolioAuditData(reps)
  );

  const [reportsList, auditData] = await Promise.all([
    reportsListPromise,
    auditPromise,
  ]);
  const selectedReport = reportsList[0] || null;

  return (
    <>
      <HeaderClient
        title="Family Portfolio - CAS Audit"
        iconName="shield-check"
        reportsList={reportsList}
        selectedReport={selectedReport}
      />
      <main className="flex-1 flex flex-col overflow-auto p-6 space-y-6 selection:bg-teal-500/30 selection:text-teal-200">
        <AuditClient initialAuditData={auditData} />
      </main>
    </>
  );
}
