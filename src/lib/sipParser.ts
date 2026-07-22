import * as XLSX from "xlsx";
import type { SipParsed, SipRow } from "@/types/sip-parser";

export function parseSipExcel(buffer: Buffer, filename: string): SipParsed {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetNames = wb.SheetNames;
  const hasSipSheet = sheetNames.some((n) => n.toLowerCase().includes("sip"));

  if (!hasSipSheet) {
    if (sheetNames.includes("1. Mutual Fund")) {
      throw new Error(
        "Invalid file: This appears to be a Mutual Fund Valuation sheet. Please upload a SIP mandates sheet."
      );
    }
    if (sheetNames.includes("Holding_Report")) {
      throw new Error(
        "Invalid file: This appears to be an MSFL holdings file. Please upload a SIP mandates sheet."
      );
    }
    if (sheetNames.includes("Equity") || sheetNames.includes("Mutual Funds")) {
      throw new Error(
        "Invalid file: This appears to be a Zerodha holdings file. Please upload a SIP mandates sheet."
      );
    }
    throw new Error(
      "Invalid file: No sheet containing 'SIP' found. Please upload a valid SIP mandates sheet."
    );
  }

  // Find the SIPs sheet (name may vary — look for first sheet that contains "SIP")
  const sheetName = sheetNames.find((n) => n.toLowerCase().includes("sip"))!;
  const ws = wb.Sheets[sheetName];
  const raw: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  }) as unknown as (string | number | null)[][];

  if (!raw || raw.length < 4) {
    throw new Error("Unexpected SIP file format: too few rows");
  }

  // Extract as-of date from header row 1 (index 1)
  // "My SIP's as on 02-07-2026"
  let asOfDate = new Date().toISOString().split("T")[0];
  const titleCell = String(raw[1]?.[0] || "");
  const dateMatch = titleCell.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (dateMatch) {
    asOfDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; // YYYY-MM-DD
  }

  // Find the actual data header row — the one that starts with "SR NO."
  const headerRowIdx = raw.findIndex(
    (row) =>
      row &&
      String(row[0] || "")
        .trim()
        .toUpperCase()
        .includes("SR")
  );
  if (headerRowIdx === -1)
    throw new Error("Cannot find header row in SIP file");

  const headerRow = raw[headerRowIdx] as (string | null)[];

  // Monthly columns start from index 4 (after SR NO, INVESTOR, SCHEME, FOLIO)
  const monthCols: { idx: number; label: string }[] = [];
  for (let i = 4; i < headerRow.length; i++) {
    const label = String(headerRow[i] || "").trim();
    if (label) monthCols.push({ idx: i, label });
  }

  if (monthCols.length === 0)
    throw new Error("No monthly columns found in SIP file");

  // Parse a month/year label (e.g. "APR 26") to a Date object for sorting
  function parseMonthYear(label: string): Date {
    const parts = label.trim().split(/\s+/);
    if (parts.length !== 2) return new Date(0);
    const [m, y] = parts;
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const monthIdx = monthNames.indexOf(m.toUpperCase());
    const year = 2000 + parseInt(y, 10);
    return new Date(year, monthIdx >= 0 ? monthIdx : 0, 1);
  }

  // Sort monthCols in ascending chronological order so the latest month is at the end
  monthCols.sort((a, b) => {
    return (
      parseMonthYear(a.label).getTime() - parseMonthYear(b.label).getTime()
    );
  });

  const sips: SipRow[] = [];

  // Parse data rows (from headerRowIdx+1 until we hit "Total" or end)
  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row[0] === null) continue;

    const srCell = row[0];
    // Skip "Total" row
    if (typeof srCell === "string" && srCell.trim().toLowerCase() === "total")
      break;
    // Skip rows where srNo is not a number
    if (typeof srCell !== "number") continue;

    const investorName = String(row[1] || "").trim();
    const schemeName = String(row[2] || "").trim();
    const folioNo = String(row[3] || "").trim();

    if (!investorName || !schemeName || !folioNo) continue;

    // Build monthly history
    const monthlyHistory: Record<string, number> = {};
    for (const col of monthCols) {
      const amt = Number(row[col.idx] ?? 0);
      monthlyHistory[col.label] = isNaN(amt) ? 0 : amt;
    }

    // Canonical amount = most common non-zero value across months
    const nonZeroAmounts = Object.values(monthlyHistory).filter((v) => v > 0);
    let monthlyAmount = 0;
    if (nonZeroAmounts.length > 0) {
      // Frequency count
      const freq: Record<number, number> = {};
      nonZeroAmounts.forEach((v) => {
        freq[v] = (freq[v] || 0) + 1;
      });
      monthlyAmount = Number(
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
      );
    }

    // A SIP is active if it has a payment in either the latest month
    // or the second-to-latest month (to allow current unpaid running months).
    const latestMonth = monthCols[monthCols.length - 1];
    const secondLatestMonth =
      monthCols.length > 1 ? monthCols[monthCols.length - 2] : null;

    const hasPaymentInLatest = (monthlyHistory[latestMonth.label] ?? 0) > 0;
    const hasPaymentInSecondLatest = secondLatestMonth
      ? (monthlyHistory[secondLatestMonth.label] ?? 0) > 0
      : false;

    const isActive = hasPaymentInLatest || hasPaymentInSecondLatest;

    sips.push({
      srNo: Number(srCell),
      investorName,
      schemeName,
      folioNo,
      monthlyAmount,
      monthlyHistory,
      startMonth: monthCols[0].label,
      isActive,
    });
  }

  return { asOfDate, sourceFile: filename, sips };
}
