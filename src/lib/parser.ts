import * as XLSX from 'xlsx';

export interface HoldingParsed {
  schemeName: string;
  folioNo: string;
  balanceUnits: number;
  purchaseNav: number;
  purchaseValue: number;
  currentNav: number;
  currentValue: number;
  dividend: number;
  gain: number;
  holdingDays: number;
  absoluteReturn: number;
  cagr: number;
  comments: string | null;
  category: string;
  memberName: string;
  memberPan: string;
}

export interface ParseResult {
  asOfDate: string; // YYYY-MM-DD
  holdings: HoldingParsed[];
  familyCagr?: number;
  memberCagrs?: { memberName: string; cagr: number }[];
}

export function parsePortfolioExcel(fileBuffer: Buffer): ParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0]; // Usually '1. Mutual Fund'
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let asOfDate = '';
  const holdings: HoldingParsed[] = [];
  let familyCagr: number | undefined;
  const memberCagrs: { memberName: string; cagr: number }[] = [];

  // Parse asOfDate from Row 2 (index 1)
  // e.g. "Portfolio Valuation Report as on 01-07-2026"
  const dateRowStr = String(rows[1]?.[0] || '');
  const dateMatch = dateRowStr.match(/as on (\d{2})-(\d{2})-(\d{4})/i);
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    asOfDate = `${yyyy}-${mm}-${dd}`;
  } else {
    // Default to today if not found
    asOfDate = new Date().toISOString().split('T')[0];
  }

  let currentMemberName = '';
  let currentMemberPan = '';
  let currentCategory = '';

  // Skip the first 4 rows (indices 0, 1, 2, 3 represent headers/metadata)
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    if (!col0) continue;

    // Check if it's the Grand Total or any section total row
    if (col0 === 'Grand Total') {
      familyCagr = Number(row[11]) || 0;
      continue;
    }

    if (col0.endsWith(' Total')) {
      if (!['Equity Total', 'Hybrid Total', 'Debt Total', 'Liquid Total', 'Other Total'].includes(col0)) {
        const memberName = col0.substring(0, col0.length - 6).trim();
        const cagr = Number(row[11]) || 0;
        memberCagrs.push({ memberName, cagr });
      }
      continue;
    }

    // Check if it's a category row (like Equity, Hybrid, Debt)
    // Usually these category rows have no values in other columns (like folio, units etc.)
    const otherColsHaveValue = row.slice(1).some(val => val !== null && val !== undefined && String(val).trim() !== '');

    if (!otherColsHaveValue) {
      if (['Equity', 'Hybrid', 'Debt', 'Liquid', 'Other'].includes(col0)) {
        currentCategory = col0;
      } else {
        const panMatch = col0.match(/(.+?)\s*\(([^)]+)\)/);
        if (panMatch) {
          currentMemberName = panMatch[1].trim();
          currentMemberPan = panMatch[2].trim();
        } else {
          currentMemberName = col0;
          currentMemberPan = '';
        }
      }
      continue;
    }

    // It's a holding row!
    const schemeName = col0;
    const folioNo = String(row[1] || '').trim();
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
    const comments = String(row[12] || '').trim();

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
        category: currentCategory || 'Equity',
        memberName: currentMemberName || 'Default Client',
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
