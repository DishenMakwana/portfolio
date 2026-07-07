import {
  pgSchema,
  serial,
  text,
  integer,
  doublePrecision,
  unique,
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

export const memberReportCagrs = mySchema.table("member_report_cagrs", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => reports.id, {
    onDelete: "cascade",
  }),
  memberId: integer("member_id").references(() => familyMembers.id, {
    onDelete: "cascade",
  }),
  cagr: doublePrecision("cagr").notNull(),
});

export const schemes = mySchema.table("schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  schemeCodeApi: text("scheme_code_api"),
  mappedAt: text("mapped_at"),
});

export const holdingsSnapshot = mySchema.table("holdings_snapshot", {
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
});

export const transactions = mySchema.table("transactions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => familyMembers.id),
  schemeId: integer("scheme_id").references(() => schemes.id),
  date: text("date").notNull(),
  type: text("type").notNull(), // 'BUY', 'SELL'
  units: doublePrecision("units").notNull(),
  nav: doublePrecision("nav").notNull(),
  amount: doublePrecision("amount").notNull(),
  sourceReportId: integer("source_report_id").references(() => reports.id),
});

export const sipMandates = mySchema.table("sip_mandates", {
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
});

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
