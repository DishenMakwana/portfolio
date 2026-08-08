import * as XLSX from "xlsx";
import type { HoldingParsed, ParseResult } from "@/types/parser";

export function parsePortfolioExcel(fileBuffer: Buffer): ParseResult {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames;
  const targetSheetName = sheetNames.find(
    (n) => n === "1. Mutual Fund" || n === "1. Mutual Funds"
  );

  if (!targetSheetName) {
    if (sheetNames.includes("Equity") || sheetNames.includes("Mutual Funds")) {
      throw new Error(
        "Invalid file: This appears to be a Zerodha holdings file. Please upload a Mutual Fund Valuation sheet."
      );
    }
    if (sheetNames.includes("Holding_Report")) {
      throw new Error(
        "Invalid file: This appears to be an MSFL holdings file. Please upload a Mutual Fund Valuation sheet."
      );
    }
    if (sheetNames.some((n) => n.toLowerCase().includes("sip"))) {
      throw new Error(
        "Invalid file: This appears to be a SIP mandates file. Please upload a Mutual Fund Valuation sheet."
      );
    }
    throw new Error(
      "Invalid file: Sheet '1. Mutual Fund' or '1. Mutual Funds' not found. Please upload a valid Mutual Fund Valuation sheet."
    );
  }

  const sheet = workbook.Sheets[targetSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let asOfDate = "";
  const holdings: HoldingParsed[] = [];
  let familyCagr: number | undefined;
  const memberCagrs: { memberName: string; cagr: number }[] = [];

  // Parse asOfDate from Row 2 (index 1)
  // e.g. "Portfolio Valuation Report as on 01-07-2026" or "till 05-08-2026"
  const dateRowStr = String(rows[1]?.[0] || "");
  const dateMatch = dateRowStr.match(
    /(?:as on|till)\s+(\d{2})-(\d{2})-(\d{4})/i
  );
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    asOfDate = `${yyyy}-${mm}-${dd}`;
  } else {
    // Default to today if not found
    asOfDate = new Date().toISOString().split("T")[0];
  }

  let currentMemberName = "";
  let currentMemberPan = "";
  let currentCategory = "";

  // Skip the first 4 rows (indices 0, 1, 2, 3 represent headers/metadata)
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || "").trim();
    if (!col0) continue;

    // Check if it's the Grand Total or any section total row
    if (col0 === "Grand Total") {
      familyCagr = Number(row[11]) || Number(row[12]) || 0;
      continue;
    }

    const isCategoryTotal = [
      "Equity Total",
      "Hybrid Total",
      "Debt Total",
      "Liquid Total",
      "Other Total",
      "SIF Total",
      "Share And Bond Total",
      "Shares And Bonds Total",
    ].some((cat) => col0.toLowerCase() === cat.toLowerCase());

    const isMemberTotal =
      col0 === "Applicant Total" ||
      (currentMemberName &&
        col0.toLowerCase().includes(currentMemberName.toLowerCase()) &&
        col0.toLowerCase().includes("total")) ||
      (col0.toLowerCase().endsWith(" total") &&
        col0.toLowerCase() !== "grand total" &&
        !isCategoryTotal);

    if (isMemberTotal) {
      const cagr = Number(row[11]) || Number(row[12]) || 0;
      if (currentMemberName && cagr > 0) {
        if (!memberCagrs.some((mc) => mc.memberName === currentMemberName)) {
          memberCagrs.push({ memberName: currentMemberName, cagr });
        }
      }
      continue;
    }

    // Check if it's a category row (like Equity, Hybrid, Debt)
    // Usually these category rows have no values in other columns (like folio, units etc.)
    const otherColsHaveValue = row
      .slice(1)
      .some(
        (val) => val !== null && val !== undefined && String(val).trim() !== ""
      );

    if (!otherColsHaveValue) {
      if (
        col0.includes(":") ||
        ["Equity", "Hybrid", "Debt", "Liquid", "Other", "SIF"].some((c) =>
          col0.startsWith(c)
        )
      ) {
        currentCategory = col0;
      } else {
        const panMatch = col0.match(/^(.*)\s*\(([^)]+)\)\s*$/);
        if (panMatch) {
          currentMemberName = panMatch[1].trim();
          currentMemberPan = panMatch[2].trim();
        } else {
          currentMemberName = col0;
          currentMemberPan = "";
        }
      }
      continue;
    }

    // It's a holding row!
    const schemeName = col0;
    const folioNo = String(row[1] || "").trim();
    const balanceUnits = Number(row[2]) || 0;
    const purchaseNav = Number(row[3]) || 0;
    const purchaseValue = Number(row[4]) || 0;
    const currentNav = Number(row[5]) || 0;
    const currentValue = Number(row[6]) || 0;
    const dividend = Number(row[7]) || 0;
    const gain = Number(row[8]) || 0;
    const holdingDays = Number(row[9]) || 0;
    const absoluteReturn = Number(row[10]) || 0;
    const cagr = Number(row[11]) || 0;
    const comments = String(row[12] || "").trim();

    if (schemeName && folioNo && balanceUnits > 0) {
      holdings.push({
        schemeName,
        folioNo,
        balanceUnits,
        purchaseNav,
        purchaseValue,
        currentNav,
        currentValue,
        dividend,
        gain,
        holdingDays,
        absoluteReturn,
        cagr,
        comments: comments || null,
        category: currentCategory || "Equity",
        memberName: currentMemberName || "Default Client",
        memberPan: currentMemberPan,
      });
    }
  }

  return {
    asOfDate,
    holdings,
    familyCagr,
    memberCagrs,
  };
}
