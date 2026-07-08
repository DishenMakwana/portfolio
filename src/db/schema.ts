import {
  pgSchema,
  serial,
  text,
  integer,
  doublePrecision,
  unique,
  index,
} from "drizzle-orm/pg-core";

// Define dynamic schema name based on environment variable
const schemaName = process.env.DB_SCHEMA || "portfolio";
export const mySchema = pgSchema(schemaName);

export const reports = mySchema.table("reports", {
  id: serial("id").primaryKey(),
  asOfDate: text("as_of_date").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  filename: text("filename").notNull(),
  cagr: doublePrecision("cagr"), // Store parsed Grand Total CAGR
});

export const familyMembers = mySchema.table("family_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  pan: text("pan"),
});

export const memberReportCagrs = mySchema.table(
  "member_report_cagrs",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id").references(() => reports.id, {
      onDelete: "cascade",
    }),
    memberId: integer("member_id").references(() => familyMembers.id, {
      onDelete: "cascade",
    }),
    cagr: doublePrecision("cagr").notNull(),
  },
  (table) => [
    index("member_report_cagrs_report_id_idx").on(table.reportId),
    index("member_report_cagrs_member_id_idx").on(table.memberId),
  ]
);

export const schemes = mySchema.table("schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  schemeCodeApi: text("scheme_code_api"),
  mappedAt: text("mapped_at"),
});

export const holdingsSnapshot = mySchema.table(
  "holdings_snapshot",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id").references(() => reports.id, {
      onDelete: "cascade",
    }),
    memberId: integer("member_id").references(() => familyMembers.id),
    schemeId: integer("scheme_id").references(() => schemes.id),
    folioNo: text("folio_no").notNull(),
    balanceUnits: doublePrecision("balance_units").notNull(),
    purchaseNav: doublePrecision("purchase_nav").notNull(),
    purchaseValue: doublePrecision("purchase_value").notNull(),
    currentNav: doublePrecision("current_nav").notNull(),
    currentValue: doublePrecision("current_value").notNull(),
    dividend: doublePrecision("dividend").default(0),
    gain: doublePrecision("gain").notNull(),
    holdingDays: integer("holding_days").notNull(),
    absoluteReturn: doublePrecision("absolute_return").notNull(),
    cagr: doublePrecision("cagr").notNull(),
    comments: text("comments"),
  },
  (table) => [
    index("holdings_snapshot_report_id_idx").on(table.reportId),
    index("holdings_snapshot_member_id_idx").on(table.memberId),
    index("holdings_snapshot_scheme_id_idx").on(table.schemeId),
  ]
);

export const transactions = mySchema.table(
  "transactions",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => familyMembers.id),
    schemeId: integer("scheme_id").references(() => schemes.id),
    date: text("date").notNull(),
    type: text("type").notNull(), // 'BUY', 'SELL'
    units: doublePrecision("units").notNull(),
    nav: doublePrecision("nav").notNull(),
    amount: doublePrecision("amount").notNull(),
    sourceReportId: integer("source_report_id").references(() => reports.id),
  },
  (table) => [
    index("transactions_member_id_idx").on(table.memberId),
    index("transactions_scheme_id_idx").on(table.schemeId),
    index("transactions_source_report_id_idx").on(table.sourceReportId),
  ]
);

export const sipMandates = mySchema.table(
  "sip_mandates",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => familyMembers.id),
    schemeId: integer("scheme_id").references(() => schemes.id),
    folioNo: text("folio_no").notNull(),
    monthlyAmount: doublePrecision("monthly_amount").notNull(),
    monthlyHistory: text("monthly_history"), // JSON string
    startMonth: text("start_month"), // e.g. "APR 26"
    isActive: integer("is_active").default(1), // 1=active 0=paused
    uploadedAt: text("uploaded_at").notNull(),
    sourceFile: text("source_file"),
  },
  (table) => [
    index("sip_mandates_member_id_idx").on(table.memberId),
    index("sip_mandates_scheme_id_idx").on(table.schemeId),
  ]
);

export const sipTransactions = mySchema.table(
  "sip_transactions",
  {
    id: serial("id").primaryKey(),
    sipMandateId: integer("sip_mandate_id").references(() => sipMandates.id, {
      onDelete: "cascade",
    }),
    month: text("month").notNull(),
    amount: doublePrecision("amount").notNull(),
    uploadedAt: text("uploaded_at").notNull(),
    sourceFile: text("source_file"),
  },
  (table) => [
    unique("sip_mandate_month_unique").on(table.sipMandateId, table.month),
    index("sip_transactions_sip_mandate_id_idx").on(table.sipMandateId),
  ]
);

export const schemeNavCacheMeta = mySchema.table("scheme_nav_cache_meta", {
  schemeCode: text("scheme_code").primaryKey(),
  fundHouse: text("fund_house").notNull(),
  schemeType: text("scheme_type").notNull(),
  schemeCategory: text("scheme_category").notNull(),
  schemeName: text("scheme_name").notNull(),
  lastFetchedAt: text("last_fetched_at").notNull(),
});

export const schemeNavHistory = mySchema.table(
  "scheme_nav_history",
  {
    id: serial("id").primaryKey(),
    schemeCode: text("scheme_code").notNull(),
    date: text("date").notNull(), // stored in DD-MM-YYYY format to match API
    nav: doublePrecision("nav").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [
    unique("scheme_nav_history_code_date_uq").on(table.schemeCode, table.date),
  ]
);

export const zerodhaReports = mySchema.table("zerodha_reports", {
  id: serial("id").primaryKey(),
  asOfDate: text("as_of_date").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  filename: text("filename").notNull(),
});

export const zerodhaHoldings = mySchema.table(
  "zerodha_holdings",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id").references(() => zerodhaReports.id, {
      onDelete: "cascade",
    }),
    holdingType: text("holding_type").notNull(), // 'equity' or 'mutual_fund'
    symbol: text("symbol").notNull(),
    isin: text("isin").notNull(),
    sector: text("sector"), // null for mutual funds
    instrumentType: text("instrument_type"), // null for stocks
    quantity: doublePrecision("quantity").notNull(),
    averagePrice: doublePrecision("average_price").notNull(),
    currentPrice: doublePrecision("current_price").notNull(),
    investedValue: doublePrecision("invested_value").notNull(),
    currentValue: doublePrecision("current_value").notNull(),
    unrealizedPnl: doublePrecision("unrealized_pnl").notNull(),
    unrealizedPnlPct: doublePrecision("unrealized_pnl_pct").notNull(),
  },
  (table) => [index("zerodha_holdings_report_id_idx").on(table.reportId)]
);

export const zerodhaSchemes = mySchema.table("zerodha_schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  schemeCodeApi: text("scheme_code_api"),
  mappedAt: text("mapped_at"),
});

export const zerodhaSchemeNavCacheMeta = mySchema.table(
  "zerodha_scheme_nav_cache_meta",
  {
    schemeCode: text("scheme_code").primaryKey(),
    fundHouse: text("fund_house").notNull(),
    schemeType: text("scheme_type").notNull(),
    schemeCategory: text("scheme_category").notNull(),
    schemeName: text("scheme_name").notNull(),
    lastFetchedAt: text("last_fetched_at").notNull(),
  }
);

export const zerodhaSchemeNavHistory = mySchema.table(
  "zerodha_scheme_nav_history",
  {
    id: serial("id").primaryKey(),
    schemeCode: text("scheme_code").notNull(),
    date: text("date").notNull(),
    nav: doublePrecision("nav").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => [
    unique("zerodha_scheme_nav_history_code_date_uq").on(
      table.schemeCode,
      table.date
    ),
  ]
);
