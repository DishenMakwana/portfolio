import { getPortfolioAuditData } from "@/lib/auditService";
import AuditClient from "@/components/mutual-fund/audit/AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auditData = await getPortfolioAuditData();

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto">
      <AuditClient initialAuditData={auditData} />
    </main>
  );
}
