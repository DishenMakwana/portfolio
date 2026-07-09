import { getDashboardDataAction } from "../src/app/actions";

async function test() {
  const dbUrl = "postgresql://postgres:root1234@127.0.0.1:5432/postgres?schema=portfolio";
  process.env.DATABASE_URL = dbUrl;

  try {
    const data = await getDashboardDataAction();
    console.log("Timeline Data results:");
    console.log(data.timelineData.map(pt => ({
      date: pt.date,
      portfolioXirr: pt.portfolioXirr,
      benchmarkXirr: pt.benchmarkXirr,
      alpha: pt.alpha
    })));
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
