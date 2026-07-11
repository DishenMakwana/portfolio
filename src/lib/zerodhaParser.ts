import * as XLSX from "xlsx";

export interface ZerodhaHoldingParsed {
  holdingType: "equity" | "mutual_fund";
  symbol: string;
  isin: string;
  sector: string | null;
  instrumentType: string | null;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface ZerodhaParseResult {
  asOfDate: string; // YYYY-MM-DD
  holdings: ZerodhaHoldingParsed[];
}

function extractAsOfDate(rows: any[][]): string | null {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    for (const val of row) {
      if (typeof val === "string") {
        // Match YYYY-MM-DD
        const yyyymmdd = val.match(/as on (\d{4}-\d{2}-\d{2})/i);
        if (yyyymmdd) return yyyymmdd[1];
        // Match DD-MM-YYYY
        const ddmmyyyy = val.match(/as on (\d{2})-(\d{2})-(\d{4})/i);
        if (ddmmyyyy) {
          const [, dd, mm, yyyy] = ddmmyyyy;
          return `${yyyy}-${mm}-${dd}`;
        }
      }
    }
  }
  return null;
}

function subtractOneDay(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseZerodhaHoldings(fileBuffer: Buffer): ZerodhaParseResult {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const holdings: ZerodhaHoldingParsed[] = [];
  let asOfDate = "";

  // Parse Equity Sheet
  const equitySheet = workbook.Sheets["Equity"];
  if (equitySheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(equitySheet, { header: 1 });
    const date = extractAsOfDate(rows);
    if (date) asOfDate = date;

    // Find header row
    let headerIdx = -1;
    let colsMap = {
      symbol: -1,
      isin: -1,
      sector: -1,
      quantity: -1,
      averagePrice: -1,
      currentPrice: -1,
      unrealizedPnl: -1,
      unrealizedPnlPct: -1,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      let symbolIdx = row.findIndex(
        (val) =>
          String(val || "")
            .trim()
            .toLowerCase() === "symbol"
      );
      let isinIdx = row.findIndex(
        (val) =>
          String(val || "")
            .trim()
            .toLowerCase() === "isin"
      );
      if (symbolIdx !== -1 && isinIdx !== -1) {
        headerIdx = i;
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j] || "")
            .trim()
            .toLowerCase();
          if (val === "symbol") colsMap.symbol = j;
          else if (val === "isin") colsMap.isin = j;
          else if (val === "sector") colsMap.sector = j;
          else if (val.includes("quantity available") || val === "quantity")
            colsMap.quantity = j;
          else if (val.includes("average price") || val.includes("avg price"))
            colsMap.averagePrice = j;
          else if (
            val.includes("previous closing") ||
            val.includes("close price") ||
            val.includes("current price")
          )
            colsMap.currentPrice = j;
          else if (val === "unrealized p&l" || val === "unrealized pnl")
            colsMap.unrealizedPnl = j;
          else if (
            val.includes("unrealized p&l pct") ||
            val.includes("unrealized pnl pct") ||
            val.includes("unrealize p&l pct")
          )
            colsMap.unrealizedPnlPct = j;
        }
        break;
      }
    }

    if (headerIdx !== -1 && colsMap.symbol !== -1 && colsMap.isin !== -1) {
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const symbol = String(row[colsMap.symbol] || "").trim();
        const isin = String(row[colsMap.isin] || "").trim();

        if (
          !symbol ||
          !isin ||
          symbol.toLowerCase().includes("total") ||
          isin.toLowerCase().includes("total")
        )
          continue;

        const quantity = Number(row[colsMap.quantity]) || 0;
        const averagePrice = Number(row[colsMap.averagePrice]) || 0;
        const currentPrice = Number(row[colsMap.currentPrice]) || 0;
        const unrealizedPnl = Number(row[colsMap.unrealizedPnl]) || 0;
        const unrealizedPnlPct = Number(row[colsMap.unrealizedPnlPct]) || 0;

        const investedValue = Math.round(quantity * averagePrice * 100) / 100;
        const currentValue = Math.round(quantity * currentPrice * 100) / 100;

        holdings.push({
          holdingType: "equity",
          symbol,
          isin,
          sector:
            colsMap.sector !== -1
              ? String(row[colsMap.sector] || "").trim()
              : "Other",
          instrumentType: null,
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

  // Parse Mutual Funds Sheet
  const mfSheet = workbook.Sheets["Mutual Funds"];
  if (mfSheet) {
    const rows: any[][] = XLSX.utils.sheet_to_json(mfSheet, { header: 1 });
    if (!asOfDate) {
      const date = extractAsOfDate(rows);
      if (date) asOfDate = date;
    }

    // Find header row
    let headerIdx = -1;
    let colsMap = {
      symbol: -1,
      isin: -1,
      instrumentType: -1,
      quantity: -1,
      averagePrice: -1,
      currentPrice: -1,
      unrealizedPnl: -1,
      unrealizedPnlPct: -1,
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      let symbolIdx = row.findIndex(
        (val) =>
          String(val || "")
            .trim()
            .toLowerCase() === "symbol"
      );
      let isinIdx = row.findIndex(
        (val) =>
          String(val || "")
            .trim()
            .toLowerCase() === "isin"
      );
      if (symbolIdx !== -1 && isinIdx !== -1) {
        headerIdx = i;
        for (let j = 0; j < row.length; j++) {
          const val = String(row[j] || "")
            .trim()
            .toLowerCase();
          if (val === "symbol") colsMap.symbol = j;
          else if (val === "isin") colsMap.isin = j;
          else if (val.includes("instrument type")) colsMap.instrumentType = j;
          else if (val.includes("quantity available") || val === "quantity")
            colsMap.quantity = j;
          else if (val.includes("average price") || val.includes("avg price"))
            colsMap.averagePrice = j;
          else if (
            val.includes("previous closing") ||
            val.includes("close price") ||
            val.includes("current price") ||
            val.includes("current nav")
          )
            colsMap.currentPrice = j;
          else if (val === "unrealized p&l" || val === "unrealized pnl")
            colsMap.unrealizedPnl = j;
          else if (
            val.includes("unrealized p&l pct") ||
            val.includes("unrealized pnl pct") ||
            val.includes("unrealize p&l pct")
          )
            colsMap.unrealizedPnlPct = j;
        }
        break;
      }
    }

    if (headerIdx !== -1 && colsMap.symbol !== -1 && colsMap.isin !== -1) {
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const symbol = String(row[colsMap.symbol] || "").trim();
        const isin = String(row[colsMap.isin] || "").trim();

        if (
          !symbol ||
          !isin ||
          symbol.toLowerCase().includes("total") ||
          isin.toLowerCase().includes("total")
        )
          continue;

        const quantity = Number(row[colsMap.quantity]) || 0;
        const averagePrice = Number(row[colsMap.averagePrice]) || 0;
        const currentPrice = Number(row[colsMap.currentPrice]) || 0;
        const unrealizedPnl = Number(row[colsMap.unrealizedPnl]) || 0;
        const unrealizedPnlPct = Number(row[colsMap.unrealizedPnlPct]) || 0;

        const investedValue = Math.round(quantity * averagePrice * 100) / 100;
        const currentValue = Math.round(quantity * currentPrice * 100) / 100;

        holdings.push({
          holdingType: "mutual_fund",
          symbol,
          isin,
          sector: null,
          instrumentType:
            colsMap.instrumentType !== -1
              ? String(row[colsMap.instrumentType] || "").trim()
              : "Mutual Fund",
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

  if (!asOfDate) {
    asOfDate = new Date().toISOString().split("T")[0];
  }
  asOfDate = subtractOneDay(asOfDate);

  return {
    asOfDate,
    holdings,
  };
}
