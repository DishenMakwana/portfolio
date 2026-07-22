import * as XLSX from "xlsx";
import type { MsflHoldingParsed, MsflParseResult } from "@/types/msfl-parser";

function extractAsOfDate(rows: unknown[][]): string | null {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    for (const val of row) {
      if (typeof val === "string") {
        // Match YYYY-MM-DD
        const yyyymmdd = val.match(/as on (\d{4}-\d{2}-\d{2})/i);
        if (yyyymmdd) return yyyymmdd[1];
        // Match DD-MM-YYYY or DD/MM/YYYY
        const ddmmyyyy = val.match(/as on (\d{2})[-/](\d{2})[-/](\d{4})/i);
        if (ddmmyyyy) {
          const [, dd, mm, yyyy] = ddmmyyyy;
          return `${yyyy}-${mm}-${dd}`;
        }
        // Match generic date with keyword context
        const genericDate = val.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
        if (
          genericDate &&
          (val.toLowerCase().includes("as of") ||
            val.toLowerCase().includes("as on") ||
            val.toLowerCase().includes("date"))
        ) {
          const [, dd, mm, yyyy] = genericDate;
          return `${yyyy}-${mm}-${dd}`;
        }
      }
    }
  }
  return null;
}

export function parseMsflHoldings(
  fileBuffer: Buffer,
  filename: string
): MsflParseResult {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetNames = workbook.SheetNames;

  if (!sheetNames.includes("Holding_Report")) {
    if (sheetNames.includes("1. Mutual Fund")) {
      throw new Error(
        "Invalid file: This appears to be a Mutual Fund Valuation sheet. Please upload an MSFL holdings sheet."
      );
    }
    if (sheetNames.includes("Equity") || sheetNames.includes("Mutual Funds")) {
      throw new Error(
        "Invalid file: This appears to be a Zerodha holdings file. Please upload an MSFL holdings sheet."
      );
    }
    if (sheetNames.some((n) => n.toLowerCase().includes("sip"))) {
      throw new Error(
        "Invalid file: This appears to be a SIP mandates file. Please upload an MSFL holdings sheet."
      );
    }
    throw new Error(
      "Invalid file: Sheet 'Holding_Report' not found. Please upload a valid MSFL holdings sheet."
    );
  }

  const holdings: MsflHoldingParsed[] = [];
  let asOfDate = "";
  const firstSheetName = "Holding_Report";
  const worksheet = workbook.Sheets[firstSheetName];

  if (worksheet) {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    });

    const dateFromSheet = extractAsOfDate(rows);
    if (dateFromSheet) {
      asOfDate = dateFromSheet;
    } else {
      // Attempt to extract asOfDate from filename if it has date info (like YYYY-MM-DD)
      const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        asOfDate = dateMatch[1];
      } else {
        const ddmmyyyy = filename.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (ddmmyyyy) {
          const [, dd, mm, yyyy] = ddmmyyyy;
          asOfDate = `${yyyy}-${mm}-${dd}`;
        }
      }
    }

    // Locate header row and map columns
    let headerIdx = -1;
    let colsMap = {
      symbol: -1,
      quantity: -1,
      averagePrice: -1,
      currentPrice: -1,
      investedValue: -1,
      currentValue: -1,
      unrealizedPnl: -1,
      unrealizedPnlPct: -1,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const symbolIdx = row.findIndex(
        (val) =>
          String(val || "")
            .trim()
            .toUpperCase() === "SYMBOL"
      );
      const qtyIdx = row.findIndex(
        (val) =>
          String(val || "")
            .trim()
            .toUpperCase() === "QTY"
      );

      if (symbolIdx !== -1 && qtyIdx !== -1) {
        headerIdx = i;
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j] || "")
            .trim()
            .toUpperCase();
          if (val === "SYMBOL") colsMap.symbol = j;
          else if (val === "QTY") colsMap.quantity = j;
          else if (
            val === "AVG. PRICE" ||
            val === "AVG PRICE" ||
            val.includes("AVERAGE")
          )
            colsMap.averagePrice = j;
          else if (
            val === "LTP" ||
            val.includes("CURRENT PRICE") ||
            val === "CLOSE PRICE"
          )
            colsMap.currentPrice = j;
          else if (
            val === "INVESTED AMT" ||
            val.includes("INVESTED VALUE") ||
            val.includes("COST BASIS")
          )
            colsMap.investedValue = j;
          else if (val === "CURRENT VALUE" || val.includes("VALUATION"))
            colsMap.currentValue = j;
          else if (
            val === "OVERALL PL" ||
            val === "OVERALL PNL" ||
            val === "P&L"
          )
            colsMap.unrealizedPnl = j;
          else if (
            val === "OVERALL PL%" ||
            val === "OVERALL PNL%" ||
            val === "RETURN %"
          )
            colsMap.unrealizedPnlPct = j;
        }
        break;
      }
    }

    if (headerIdx !== -1 && colsMap.symbol !== -1 && colsMap.quantity !== -1) {
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const symbol = String(row[colsMap.symbol] || "").trim();
        if (!symbol || symbol.toLowerCase().includes("total") || symbol === "")
          continue;

        const quantity = Number(row[colsMap.quantity]) || 0;
        const averagePrice = Number(row[colsMap.averagePrice]) || 0;
        const currentPrice = Number(row[colsMap.currentPrice]) || 0;

        // Invested Value / Current Value - fallback to calculated value if not parsed
        let investedValue =
          colsMap.investedValue !== -1 ? Number(row[colsMap.investedValue]) : 0;
        if (!investedValue) {
          investedValue = Math.round(quantity * averagePrice * 100) / 100;
        }

        let currentValue =
          colsMap.currentValue !== -1 ? Number(row[colsMap.currentValue]) : 0;
        if (!currentValue) {
          currentValue = Math.round(quantity * currentPrice * 100) / 100;
        }

        let unrealizedPnl =
          colsMap.unrealizedPnl !== -1 ? Number(row[colsMap.unrealizedPnl]) : 0;
        if (!unrealizedPnl) {
          unrealizedPnl =
            Math.round((currentValue - investedValue) * 100) / 100;
        }

        let unrealizedPnlPct =
          colsMap.unrealizedPnlPct !== -1
            ? Number(row[colsMap.unrealizedPnlPct])
            : 0;
        if (!unrealizedPnlPct && investedValue > 0) {
          unrealizedPnlPct = (unrealizedPnl / investedValue) * 100;
        }

        holdings.push({
          symbol,
          quantity,
          averagePrice,
          currentPrice,
          investedValue,
          currentValue,
          unrealizedPnl,
          unrealizedPnlPct,
        });
      }
    }
  }

  // Fallback asOfDate to today's date if not extracted
  if (!asOfDate) {
    asOfDate = new Date().toISOString().split("T")[0];
  }

  return {
    asOfDate,
    holdings,
  };
}
