import { parsePortfolioExcel } from './parser';
import { saveReportSnapshot, getReports, getReportHoldings } from './portfolioService';
import { db } from '../db/db';
import { transactions } from '../db/schema';
import fs from 'fs';

async function main() {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error('Please provide a file path as an argument. Usage: npx tsx src/lib/test-parser.ts <path-to-excel-file>');
      process.exit(1);
    }
    console.log(`[1] Reading Excel file from: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    
    console.log('[2] Parsing file...');
    const parsed = parsePortfolioExcel(buffer);
    
    console.log(` -> As of date: ${parsed.asOfDate}`);
    console.log(` -> Total holdings parsed: ${parsed.holdings.length}`);
    
    // Sample parsed holding print
    if (parsed.holdings.length > 0) {
      console.log('\n[Sample Parsed Holding]:', {
        schemeName: parsed.holdings[0].schemeName,
        memberName: parsed.holdings[0].memberName,
        folioNo: parsed.holdings[0].folioNo,
        balanceUnits: parsed.holdings[0].balanceUnits,
        purchaseValue: parsed.holdings[0].purchaseValue,
        cagr: parsed.holdings[0].cagr,
      });
    }

    const reportId = await saveReportSnapshot(
      parsed.asOfDate,
      filePath.split('/').pop() || 'portfolio.xlsx',
      parsed.holdings,
      parsed.familyCagr,
      parsed.memberCagrs
    );
    console.log(` -> Success! Saved with Report ID: ${reportId}`);
    
    const reportsList = await getReports();
    console.log('\n[4] Reports table contents:', reportsList);
    
    const dbHoldings = await getReportHoldings(reportId);
    console.log(`\n[5] Holdings snapshot record count: ${dbHoldings.length}`);
    
    const txs = await db.select().from(transactions);
    console.log(`\n[6] Reconstructed Transactions record count: ${txs.length}`);
    if (txs.length > 0) {
      console.log(' -> Sample Reconstructed Tx:', {
        date: txs[0].date,
        type: txs[0].type,
        units: txs[0].units,
        amount: txs[0].amount,
      });
    }
    
    console.log('\n[7] Verification successful!');
  } catch (error) {
    console.error('Test Parser Error:', error);
  }
}

main().then(() => process.exit(0));
