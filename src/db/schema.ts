import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  asOfDate: text('as_of_date').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  filename: text('filename').notNull(),
  cagr: real('cagr'), // Store parsed Grand Total CAGR
});

export const familyMembers = sqliteTable('family_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  pan: text('pan'),
});

export const memberReportCagrs = sqliteTable('member_report_cagrs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').references(() => reports.id, { onDelete: 'cascade' }),
  memberId: integer('member_id').references(() => familyMembers.id, { onDelete: 'cascade' }),
  cagr: real('cagr').notNull(),
});

export const schemes = sqliteTable('schemes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  category: text('category').notNull(),
  schemeCodeApi: text('scheme_code_api'),
  mappedAt: text('mapped_at'),
});

export const holdingsSnapshot = sqliteTable('holdings_snapshot', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').references(() => reports.id, { onDelete: 'cascade' }),
  memberId: integer('member_id').references(() => familyMembers.id),
  schemeId: integer('scheme_id').references(() => schemes.id),
  folioNo: text('folio_no').notNull(),
  balanceUnits: real('balance_units').notNull(),
  purchaseNav: real('purchase_nav').notNull(),
  purchaseValue: real('purchase_value').notNull(),
  currentNav: real('current_nav').notNull(),
  currentValue: real('current_value').notNull(),
  dividend: real('dividend').default(0),
  gain: real('gain').notNull(),
  holdingDays: integer('holding_days').notNull(),
  absoluteReturn: real('absolute_return').notNull(),
  cagr: real('cagr').notNull(),
  comments: text('comments'),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').references(() => familyMembers.id),
  schemeId: integer('scheme_id').references(() => schemes.id),
  date: text('date').notNull(),
  type: text('type').notNull(), // 'BUY', 'SELL'
  units: real('units').notNull(),
  nav: real('nav').notNull(),
  amount: real('amount').notNull(),
  sourceReportId: integer('source_report_id').references(() => reports.id),
});

/**
 * sip_mandates — one row per investor × scheme × folio SIP mandate.
 * monthlyAmount  : canonical fixed SIP amount (₹) — most common non-zero value seen
 * monthlyHistory : JSON blob { "APR 26": 5000, "MAY 26": 5000, "JUN 26": 0, ... }
 * isActive       : 1 = running, 0 = paused/stopped (latest column was 0)
 */
export const sipMandates = sqliteTable('sip_mandates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').references(() => familyMembers.id),
  schemeId: integer('scheme_id').references(() => schemes.id),
  folioNo: text('folio_no').notNull(),
  monthlyAmount: real('monthly_amount').notNull(),
  monthlyHistory: text('monthly_history'),   // JSON string
  startMonth: text('start_month'),           // e.g. "APR 26"
  isActive: integer('is_active').default(1), // 1=active 0=paused
  uploadedAt: text('uploaded_at').notNull(),
  sourceFile: text('source_file'),
});

