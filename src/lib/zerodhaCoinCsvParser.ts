import * as XLSX from "xlsx";
import type {
  ParsedCoinOrderRow,
  CoinCsvParseResult,
} from "@/types/transactionUpload";

function parseIsoDate(rawDate: unknown): string {
  if (!rawDate) return "";
  if (rawDate instanceof Date) {
    const yyyy = rawDate.getFullYear();
    const mm = String(rawDate.getMonth() + 1).padStart(2, "0");
    const dd = String(rawDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const str = String(rawDate).trim();
  if (!str) return "";

  // Exact YYYY-MM-DD pattern
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Prefix YYYY-MM-DD (e.g. "2026-09-01 14:30:00" or ISO timestamp)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // Excel serial number (e.g. 46230)
  if (!isNaN(Number(str)) && Number(str) > 20000 && Number(str) < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Split date by standard delimiters: / or - or .
  const parts = str.split(/[-/.]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts.map((p) => p.trim());

    // Case 1: YYYY-MM-DD or YYYY/MM/DD (p1 is 4-digit year)
    if (p1.length === 4) {
      const yyyy = p1;
      const mm = p2.padStart(2, "0");
      const dd = p3.padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    // Case 2: DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY (p3 is 4-digit year)
    if (p3.length === 4) {
      const yyyy = p3;
      const p1Num = parseInt(p1, 10);
      const p2Num = parseInt(p2, 10);
      let dd = p1.padStart(2, "0");
      let mm = p2.padStart(2, "0");
      if (p2Num > 12 && p1Num <= 12) {
        // Fallback for MM/DD/YYYY if mm > 12
        mm = p1.padStart(2, "0");
        dd = p2.padStart(2, "0");
      }
      return `${yyyy}-${mm}-${dd}`;
    }

    // Case 3: 2-digit years (e.g. "08-09-26", "26-09-08", "8/9/26")
    if (p1.length <= 2 && p2.length <= 2 && p3.length <= 2) {
      const n1 = parseInt(p1, 10);
      const n2 = parseInt(p2, 10);
      const n3 = parseInt(p3, 10);

      let yNum: number;
      let mNum: number;
      let dNum: number;

      if (n1 >= 20 && n1 <= 50 && n2 <= 12 && n3 <= 31) {
        // YY-MM-DD (e.g. 26-09-08)
        yNum = 2000 + n1;
        mNum = n2;
        dNum = n3;
      } else if (n3 >= 20 && n3 <= 50) {
        // DD-MM-YY (e.g. 08-09-26)
        yNum = 2000 + n3;
        mNum = n2;
        dNum = n1;
      } else {
        // Default DD-MM-YY
        yNum = n3 < 50 ? 2000 + n3 : 1900 + n3;
        mNum = n2;
        dNum = n1;
      }

      const yyyy = String(yNum);
      const mm = String(mNum).padStart(2, "0");
      const dd = String(dNum).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Fallback via Date object parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

export function parseZerodhaCoinCsv(
  content: string | Buffer
): CoinCsvParseResult {
  const errors: string[] = [];

  let records: Record<string, string>[] = [];
  try {
    const workbook = XLSX.read(content, {
      type: typeof content === "string" ? "string" : "buffer",
      raw: true,
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName || !workbook.Sheets[sheetName]) {
      return {
        rows: [],
        totalRows: 0,
        completeRows: 0,
        skippedNonComplete: 0,
        errors: ["CSV file is empty or could not be read."],
      };
    }
    records = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[sheetName],
      { raw: true, defval: "" }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse CSV";
    return {
      rows: [],
      totalRows: 0,
      completeRows: 0,
      skippedNonComplete: 0,
      errors: [msg],
    };
  }

  const rows: ParsedCoinOrderRow[] = [];
  let skippedNonComplete = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const status = (r.status || "").trim().toUpperCase();

    if (status !== "COMPLETE") {
      skippedNonComplete++;
      continue;
    }

    const clientId = (r.client_id || "").trim();
    const isin = (r.isin || "").trim().toUpperCase();
    const schemeName = (r.scheme_name || "").trim();
    const rawTradeDate = (r.trade_date || "").trim();
    const date = parseIsoDate(rawTradeDate);

    if (!clientId || !isin || !date) {
      errors.push(
        `Row ${i + 2}: Missing required fields (client_id, isin, or trade_date)`
      );
      continue;
    }

    const units = parseFloat(r.units) || 0;
    const nav = parseFloat(r.nav) || 0;
    const amount = parseFloat(r.amount) || 0;
    const folioNumber = (r.folio_number || "").trim() || null;
    const transactionMode = (r.transaction_mode || r.type || "BUY")
      .trim()
      .toUpperCase();

    rows.push({
      clientId,
      isin,
      schemeName,
      plan: (r.plan || "").trim() || null,
      transactionMode,
      settlementId: (r.settlement_id || "").trim() || null,
      tradeDate: date,
      orderedAt: (r.ordered_at || "").trim() || null,
      folioNumber,
      amount,
      units,
      nav,
      status,
      exchangeOrderId: (r.exchange_order_id || "").trim() || null,
      remarks: (r.remarks || "").trim() || null,
      tag: (r.tag || "").trim() || null,
    });
  }

  return {
    rows,
    totalRows: records.length,
    completeRows: rows.length,
    skippedNonComplete,
    errors,
  };
}
