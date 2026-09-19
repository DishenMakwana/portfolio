import { Suspense } from "react";
import { getPortfolioAuditData } from "@/lib/auditService";
import AuditClient from "@/components/mutual-fund/audit/AuditClient";
import HeaderClient from "@/components/shared/HeaderClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auditData = await getPortfolioAuditData();

  return (
    <>
      <HeaderClient
        title="Family Portfolio - CAS Audit"
        iconName="shield-check"
      />
      <main className="flex-1 overflow-auto p-6 space-y-6 selection:bg-teal-500/30 selection:text-teal-200">
        <Suspense fallback={null}>
          <AuditClient initialAuditData={auditData} />
        </Suspense>
      </main>
    </>
  );
}
