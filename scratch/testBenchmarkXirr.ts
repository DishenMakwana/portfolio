import { db } from "../src/db/db";
import { transactions, reports } from "../src/db/schema";
import { calculateAlpha, getBenchmarkHistory } from "../src/lib/alpha";
import { asc } from "drizzle-orm";

async function test() {
  const dbUrl = "postgresql://postgres:root1234@127.0.0.1:5432/postgres?schema=portfolio";
  process.env.DATABASE_URL = dbUrl;

  try {
    const reportsList = await db.select().from(reports).orderBy(asc(reports.asOfDate));
    console.log("Reports found:", reportsList.map(r => ({ id: r.id, date: r.asOfDate })));

    if (reportsList.length === 0) {
      console.log("No reports found!");
      return;
    }

    const testReport = reportsList[reportsList.length - 1];
    const testDate = testReport.asOfDate;

    // Get transactions up to that date
    const txs = await db.select().from(transactions);
    console.log(`Total transactions in DB: ${txs.length}`);

    const formattedTxs = txs.map(t => ({
      date: t.date,
      type: t.type as "BUY" | "SELL",
      amount: Number(t.amount),
      units: Number(t.units),
    }));

    // Fetch Nifty Details
    const nifty = await getBenchmarkHistory("120716");
    console.log("Nifty NAV History length:", nifty?.data?.length);

    // Call calculateAlpha and inspect step-by-step
    const alphaRes = await calculateAlpha(formattedTxs, testDate, 5000000, "120716");
    console.log("Result of calculateAlpha:", alphaRes);

  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
