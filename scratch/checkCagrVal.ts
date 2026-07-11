process.env.DATABASE_URL = "postgresql://postgres:root1234@127.0.0.1:5432/postgres?schema=portfolio";
import { db } from "../src/db/db";
import { zerodhaHoldings } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function test() {
  try {
    const res = await db
      .select({
        id: zerodhaHoldings.id,
        symbol: zerodhaHoldings.symbol,
        averagePrice: zerodhaHoldings.averagePrice,
        currentPrice: zerodhaHoldings.currentPrice,
      })
      .from(zerodhaHoldings)
      .where(eq(zerodhaHoldings.id, 124));
    console.log("Zerodha Holding ID 124:", res[0]);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
