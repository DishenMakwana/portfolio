import { notFound } from 'next/navigation';
import { db } from '@/db/db';
import { holdingsSnapshot, schemes, familyMembers, reports, transactions } from '@/db/schema';
import { eq, and, lte, asc } from 'drizzle-orm';
import { calculateAlpha } from '@/lib/alpha';
import FundDetailsClient from './FundDetailsClient';

export const dynamic = 'force-dynamic';

interface FundPageProps {
  params: Promise<{ id: string }>;
}

export default async function FundDetailsPage({ params }: FundPageProps) {
  const { id } = await params;
  const holdingId = parseInt(id, 10);

  if (isNaN(holdingId)) {
    notFound();
  }

  // 1. Fetch holding snapshot details
  const holding = await db.select({
    id: holdingsSnapshot.id,
    schemeId: holdingsSnapshot.schemeId,
    memberId: holdingsSnapshot.memberId,
    schemeName: schemes.name,
    category: schemes.category,
    schemeCodeApi: schemes.schemeCodeApi,
    folioNo: holdingsSnapshot.folioNo,
    balanceUnits: holdingsSnapshot.balanceUnits,
    purchaseNav: holdingsSnapshot.purchaseNav,
    purchaseValue: holdingsSnapshot.purchaseValue,
    currentNav: holdingsSnapshot.currentNav,
    currentValue: holdingsSnapshot.currentValue,
    dividend: holdingsSnapshot.dividend,
    gain: holdingsSnapshot.gain,
    holdingDays: holdingsSnapshot.holdingDays,
    absoluteReturn: holdingsSnapshot.absoluteReturn,
    cagr: holdingsSnapshot.cagr,
    comments: holdingsSnapshot.comments,
    memberName: familyMembers.name,
    memberPan: familyMembers.pan,
    asOfDate: reports.asOfDate,
    reportId: reports.id,
  })
  .from(holdingsSnapshot)
  .leftJoin(schemes, eq(holdingsSnapshot.schemeId, schemes.id))
  .leftJoin(familyMembers, eq(holdingsSnapshot.memberId, familyMembers.id))
  .leftJoin(reports, eq(holdingsSnapshot.reportId, reports.id))
  .where(eq(holdingsSnapshot.id, holdingId))
  .then(res => res[0]);

  if (!holding || !holding.schemeId || !holding.memberId || !holding.asOfDate) {
    notFound();
  }

  // 2. Fetch transaction history for this fund
  const fundTxs = await db.select()
    .from(transactions)
    .where(
      and(
        eq(transactions.schemeId, holding.schemeId),
        eq(transactions.memberId, holding.memberId),
        lte(transactions.date, holding.asOfDate)
      )
    )
    .orderBy(asc(transactions.date));

  // 3. Format transactions for XIRR/Alpha calculation
  const mappedTxs = fundTxs.map(tx => ({
    date: tx.date,
    type: tx.type as 'BUY' | 'SELL',
    amount: tx.amount,
    units: tx.units,
  }));

  // 4. Calculate dynamic XIRR and Alpha
  const metrics = await calculateAlpha(
    mappedTxs,
    holding.asOfDate,
    holding.currentValue
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500/30 selection:text-teal-200">
      <FundDetailsClient
        holding={holding}
        transactions={fundTxs}
        metrics={metrics}
      />
    </main>
  );
}
