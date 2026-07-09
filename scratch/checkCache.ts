import { getBenchmarkHistory } from "../src/lib/alpha";

async function test() {
  try {
    const res = await getBenchmarkHistory("120716");
    console.log("RESULT METADATA:", res?.meta);
    console.log("RESULT DATA LENGTH:", res?.data?.length);
    if (res?.data) {
      console.log("SAMPLE DATA:", res.data.slice(0, 5));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
