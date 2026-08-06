import {
  pgSchema,
  serial,
  text,
  integer,
  doublePrecision,
  unique,
  index,
  timestamp,
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
  casId: text("cas_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const familyMembers = mySchema.table("family_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  pan: text("pan"),
  address: text("address"),
  email: text("email"),
  mobile: text("mobile"),
  dematNominee: text("demat_nominee"),
  dpId: text("dp_id"),
  clientId: text("client_id"),
  dpName: text("dp_name"),
  boSubStatus: text("bo_sub_status"),
  bsda: text("bsda"),
  rgess: text("rgess"),
  accountStatus: text("account_status"),
  frozenStatus: text("frozen_status"),
  boStatus: text("bo_status"),
  nsdlId: text("nsdl_id"),
  dob: text("dob"),
  aadhaarStatus: text("aadhaar_status"),
  linkedBankName: text("linked_bank_name"),
  linkedBankIfsc: text("linked_bank_ifsc"),
  linkedBankAccountNo: text("linked_bank_account_no"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("member_report_cagrs_report_id_idx").on(table.reportId),
    index("member_report_cagrs_member_id_idx").on(table.memberId),
  ]
);

export const schemes = mySchema.table(
  "schemes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    category: text("category").notNull(),
    schemeCodeApi: text("scheme_code_api"),
    mappedAt: text("mapped_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("schemes_scheme_code_api_idx").on(table.schemeCodeApi)]
);

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
    modeOfHolding: text("mode_of_holding"),
    kycStatus: text("kyc_status"),
    ucc: text("ucc"),
    email: text("email"),
    mobile: text("mobile"),
    nominee: text("nominee"),
    rta: text("rta"),
    isin: text("isin"),
    annualisedReturn: doublePrecision("annualised_return"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
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
    folioNo: text("folio_no"),
    date: text("date").notNull(),
    type: text("type").notNull(), // 'BUY', 'SELL'
    transactionType: text("transaction_type"), // 'SIP', 'Purchase', 'Switch In', 'Switch Out', 'Sell', etc.
    units: doublePrecision("units").notNull(),
    nav: doublePrecision("nav").notNull(),
    amount: doublePrecision("amount").notNull(),
    stampDuty: doublePrecision("stamp_duty"),
    stt: doublePrecision("stt").default(0),
    sourceReportId: integer("source_report_id").references(() => reports.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("transactions_member_id_idx").on(table.memberId),
    index("transactions_scheme_id_idx").on(table.schemeId),
    index("transactions_source_report_id_idx").on(table.sourceReportId),
    index("transactions_date_idx").on(table.date),
    index("transactions_stt_idx").on(table.stt),
    index("transactions_type_idx").on(table.type),
    index("transactions_txn_type_idx").on(table.transactionType),
    index("transactions_holding_lookup_idx").on(
      table.memberId,
      table.schemeId,
      table.folioNo,
      table.type
    ),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
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
  isinGrowth: text("isin_growth"),
  isinDivReinvestment: text("isin_div_reinvestment"),
  lastFetchedAt: text("last_fetched_at").notNull(),
  launchDate: text("launch_date"),
  corpusCr: doublePrecision("corpus_cr"),
  expenseRatio: doublePrecision("expense_ratio"),
  exitLoad: text("exit_load"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const schemeNavHistory = mySchema.table(
  "scheme_nav_history",
  {
    id: serial("id").primaryKey(),
    schemeCode: text("scheme_code").notNull(),
    date: text("date").notNull(), // stored in DD-MM-YYYY format to match API
    nav: doublePrecision("nav").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("scheme_nav_history_code_date_uq").on(table.schemeCode, table.date),
    index("scheme_nav_history_scheme_code_idx").on(table.schemeCode),
  ]
);

export const zerodhaReports = mySchema.table("zerodha_reports", {
  id: serial("id").primaryKey(),
  asOfDate: text("as_of_date").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const zerodhaHoldings = mySchema.table(
  "zerodha_holdings",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id").references(() => zerodhaReports.id, {
      onDelete: "cascade",
    }),
    schemeId: integer("scheme_id")
      .references(() => zerodhaSchemes.id, { onDelete: "cascade" })
      .notNull(),
    quantity: doublePrecision("quantity").notNull(),
    averagePrice: doublePrecision("average_price").notNull(),
    currentPrice: doublePrecision("current_price").notNull(),
    investedValue: doublePrecision("invested_value").notNull(),
    currentValue: doublePrecision("current_value").notNull(),
    unrealizedPnl: doublePrecision("unrealized_pnl").notNull(),
    unrealizedPnlPct: doublePrecision("unrealized_pnl_pct").notNull(),
    frozenQuantity: doublePrecision("frozen_quantity"),
    pledgedQuantity: doublePrecision("pledged_quantity"),
    pledgeSetupQuantity: doublePrecision("pledge_setup_quantity"),
    freeQuantity: doublePrecision("free_quantity"),
    lockinQuantity: doublePrecision("lockin_quantity"),
    lockinDate: text("lockin_date"),
    balanceDescription: text("balance_description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("zerodha_holdings_report_id_idx").on(table.reportId),
    index("zerodha_holdings_scheme_id_idx").on(table.schemeId),
  ]
);

export const zerodhaSchemes = mySchema.table(
  "zerodha_schemes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    category: text("category").notNull(),
    isin: text("isin"),
    holdingType: text("holding_type"),
    sector: text("sector"),
    marketCapCategory: text("market_cap_category"),
    instrumentType: text("instrument_type"),
    schemeCodeApi: text("scheme_code_api"),
    mappedAt: text("mapped_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("zerodha_schemes_scheme_code_api_idx").on(table.schemeCodeApi),
  ]
);

export const zerodhaSchemeNavCacheMeta = mySchema.table(
  "zerodha_scheme_nav_cache_meta",
  {
    schemeCode: text("scheme_code").primaryKey(),
    fundHouse: text("fund_house").notNull(),
    schemeType: text("scheme_type").notNull(),
    schemeCategory: text("scheme_category").notNull(),
    schemeName: text("scheme_name").notNull(),
    isinGrowth: text("isin_growth"),
    isinDivReinvestment: text("isin_div_reinvestment"),
    lastFetchedAt: text("last_fetched_at").notNull(),
    launchDate: text("launch_date"),
    corpusCr: doublePrecision("corpus_cr"),
    expenseRatio: doublePrecision("expense_ratio"),
    exitLoad: text("exit_load"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("zerodha_scheme_nav_history_code_date_uq").on(
      table.schemeCode,
      table.date
    ),
    index("zerodha_scheme_nav_history_scheme_code_idx").on(table.schemeCode),
  ]
);

export const zerodhaTransactions = mySchema.table(
  "zerodha_transactions",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => familyMembers.id, {
      onDelete: "cascade",
    }),
    schemeId: integer("scheme_id").references(() => zerodhaSchemes.id, {
      onDelete: "cascade",
    }),
    folioNo: text("folio_no"),
    date: text("date").notNull(),
    type: text("type").notNull(),
    rawTransactionType: text("raw_transaction_type"),
    units: doublePrecision("units").notNull(),
    nav: doublePrecision("nav").notNull(),
    amount: doublePrecision("amount").notNull(),
    broker: text("broker"),
    assetType: text("asset_type").default("mutual_fund"),
    uploadedAt: text("uploaded_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("zerodha_transactions_member_id_idx").on(table.memberId),
    index("zerodha_transactions_scheme_id_idx").on(table.schemeId),
    index("zerodha_transactions_date_idx").on(table.date),
  ]
);

export const benchmarkNavCacheMeta = mySchema.table(
  "benchmark_nav_cache_meta",
  {
    benchmarkCode: text("benchmark_code").primaryKey(),
    benchmarkName: text("benchmark_name").notNull(),
    fundHouse: text("fund_house"),
    schemeType: text("scheme_type"),
    schemeCategory: text("scheme_category"),
    isinGrowth: text("isin_growth"),
    isinDivReinvestment: text("isin_div_reinvestment"),
    lastFetchedAt: text("last_fetched_at").notNull(),
    launchDate: text("launch_date"),
    corpusCr: doublePrecision("corpus_cr"),
    expenseRatio: doublePrecision("expense_ratio"),
    exitLoad: text("exit_load"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

export const benchmarkNavHistory = mySchema.table(
  "benchmark_nav_history",
  {
    id: serial("id").primaryKey(),
    benchmarkCode: text("benchmark_code").notNull(),
    date: text("date").notNull(),
    nav: doublePrecision("nav").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("benchmark_nav_history_code_date_uq").on(
      table.benchmarkCode,
      table.date
    ),
    index("benchmark_nav_history_benchmark_code_idx").on(table.benchmarkCode),
  ]
);

export const msflReports = mySchema.table("msfl_reports", {
  id: serial("id").primaryKey(),
  asOfDate: text("as_of_date").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  filename: text("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const msflHoldings = mySchema.table(
  "msfl_holdings",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id").references(() => msflReports.id, {
      onDelete: "cascade",
    }),
    schemeId: integer("scheme_id")
      .references(() => msflSchemes.id, { onDelete: "cascade" })
      .notNull(),
    quantity: doublePrecision("quantity").notNull(),
    averagePrice: doublePrecision("average_price").notNull(),
    currentPrice: doublePrecision("current_price").notNull(),
    investedValue: doublePrecision("invested_value").notNull(),
    currentValue: doublePrecision("current_value").notNull(),
    unrealizedPnl: doublePrecision("unrealized_pnl").notNull(),
    unrealizedPnlPct: doublePrecision("unrealized_pnl_pct").notNull(),
    faceValue: doublePrecision("face_value"),
    tradingStatus: text("trading_status"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("msfl_holdings_report_id_idx").on(table.reportId),
    index("msfl_holdings_scheme_id_idx").on(table.schemeId),
  ]
);

export const msflSchemes = mySchema.table(
  "msfl_schemes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    category: text("category").notNull(),
    isin: text("isin"),
    holdingType: text("holding_type"),
    sector: text("sector"),
    marketCapCategory: text("market_cap_category"),
    instrumentType: text("instrument_type"),
    schemeCodeApi: text("scheme_code_api"),
    mappedAt: text("mapped_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("msfl_schemes_scheme_code_api_idx").on(table.schemeCodeApi)]
);

export const msflSchemeNavCacheMeta = mySchema.table(
  "msfl_scheme_nav_cache_meta",
  {
    schemeCode: text("scheme_code").primaryKey(),
    fundHouse: text("fund_house").notNull(),
    schemeType: text("scheme_type").notNull(),
    schemeCategory: text("scheme_category").notNull(),
    schemeName: text("scheme_name").notNull(),
    isinGrowth: text("isin_growth"),
    isinDivReinvestment: text("isin_div_reinvestment"),
    lastFetchedAt: text("last_fetched_at").notNull(),
    launchDate: text("launch_date"),
    corpusCr: doublePrecision("corpus_cr"),
    expenseRatio: doublePrecision("expense_ratio"),
    exitLoad: text("exit_load"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

export const msflSchemeNavHistory = mySchema.table(
  "msfl_scheme_nav_history",
  {
    id: serial("id").primaryKey(),
    schemeCode: text("scheme_code").notNull(),
    date: text("date").notNull(),
    nav: doublePrecision("nav").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("msfl_scheme_nav_history_code_date_uq").on(
      table.schemeCode,
      table.date
    ),
    index("msfl_scheme_nav_history_scheme_code_idx").on(table.schemeCode),
  ]
);

export const benchmarkRules = mySchema.table("benchmark_rules", {
  id: serial("id").primaryKey(),
  categoryPattern: text("category_pattern"),
  schemeNamePattern: text("scheme_name_pattern"),
  benchmarkCode: text("benchmark_code").notNull(),
  benchmarkName: text("benchmark_name").notNull(),
  benchmarkFundName: text("benchmark_fund_name").notNull(),
  priority: integer("priority").default(0).notNull(),
  corpusCr: doublePrecision("corpus_cr"),
  expenseRatio: doublePrecision("expense_ratio"),
  exitLoad: text("exit_load"),
  allocationEquity: doublePrecision("allocation_equity").default(0).notNull(),
  allocationDebt: doublePrecision("allocation_debt").default(0).notNull(),
  allocationGold: doublePrecision("allocation_gold").default(0).notNull(),
  allocationGlobalEquity: doublePrecision("allocation_global_equity")
    .default(0)
    .notNull(),
  allocationOther: doublePrecision("allocation_other").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const bullionHistory = mySchema.table(
  "bullion_history",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(),
    timestamp: doublePrecision("timestamp").notNull(),
    goldPrice: doublePrecision("gold_price").notNull(),
    silverPrice: doublePrecision("silver_price").notNull(),
    platinumPrice: doublePrecision("platinum_price").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("bullion_history_date_uq").on(table.date),
    index("bullion_history_date_idx").on(table.date),
  ]
);
