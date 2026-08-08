import * as XLSX from "xlsx";
import type { ParsedTransactionRow } from "@/types/transactionUpload";

export function parseXlsxDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const dd = String(val.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // Match M/D/YY or MM/DD/YY (e.g. 7/27/26 -> 2026-07-27)
  const matchMDYY = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (matchMDYY) {
    const [, m, d, yy] = matchMDYY;
    const fullYear = Number(yy) < 50 ? 2000 + Number(yy) : 1900 + Number(yy);
    const month = m.padStart(2, "0");
    const day = d.padStart(2, "0");
    return `${fullYear}-${month}-${day}`;
  }

  // Match M/D/YYYY or MM/DD/YYYY (e.g. 7/27/2026 -> 2026-07-27)
  const matchMDYYYY = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (matchMDYYYY) {
    const [, p1, p2, yyyy] = matchMDYYYY;
    let month = Number(p1);
    let day = Number(p2);
    if (month > 12) {
      day = Number(p1);
      month = Number(p2);
    }
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Match YYYY/MM/DD
  const matchYMD = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchYMD) {
    const [, y, m, d] = matchYMD;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Excel serial number (e.g. 46230)
  if (!isNaN(Number(str)) && Number(str) > 20000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

export function parseTransactionXlsx(
  fileBuffer: Buffer
): ParsedTransactionRow[] {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Invalid Excel file: No sheets found.");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
  });

  const parsedRows: ParsedTransactionRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || typeof row !== "object") continue;

    const normalizedRow: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      normalizedRow[k.trim().toUpperCase()] = v;
    }

    const rawDate = normalizedRow["TRANSACTION DATE"];
    const schemeName = String(normalizedRow["SCHEME NAME"] || "")
      .replace(/^'/, "")
      .replace(/\s+/g, " ")
      .trim();
    const rawFolio = String(normalizedRow["FOLIO NO"] || "")
      .replace(/^'/, "")
      .trim();
    const name = String(normalizedRow["NAME"] || "")
      .replace(/\s+/g, " ")
      .trim();
    const pan = String(normalizedRow["PAN"] || "")
      .toUpperCase()
      .trim();
    const txnType = String(normalizedRow["TXN TYPE"] || "").trim();
    const amountVal = Number(
      normalizedRow["AMOUNT"] || normalizedRow["TOTAL AMOUNT"] || 0
    );
    const unitsVal = Number(normalizedRow["UNITS"] || 0);
    const navVal = Number(normalizedRow["NAV"] || 0);
    const stampDutyVal =
      normalizedRow["STAMP DUTY"] !== undefined &&
      normalizedRow["STAMP DUTY"] !== null
        ? Number(normalizedRow["STAMP DUTY"])
        : null;
    const sttVal =
      normalizedRow["STT"] !== undefined && normalizedRow["STT"] !== null
        ? Number(normalizedRow["STT"])
        : null;

    if (!rawDate || !schemeName || !name) continue;

    const dateStr = parseXlsxDate(rawDate).trim();
    if (!dateStr || dateStr.length < 10) continue;

    const folioNo = rawFolio;
    const upperTxnType = txnType.toUpperCase();
    const isSell =
      upperTxnType.includes("REDEMPTION") ||
      upperTxnType.includes("SELL") ||
      upperTxnType.includes("SWOUT") ||
      upperTxnType.includes("SWITCH OUT") ||
      upperTxnType.includes("STP OUT");

    parsedRows.push({
      date: dateStr,
      schemeName,
      folioNo,
      memberName: name,
      pan,
      transactionType: txnType || (isSell ? "Redemption" : "Purchase"),
      type: isSell ? "SELL" : "BUY",
      amount: Math.abs(amountVal),
      units: Math.abs(unitsVal),
      nav: Math.abs(navVal),
      stampDuty: stampDutyVal,
      stt: sttVal,
    });
  }

  return parsedRows;
}
