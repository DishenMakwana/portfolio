CREATE TABLE "portfolio"."benchmark_nav_cache_meta" (
	"benchmark_code" text PRIMARY KEY NOT NULL,
	"benchmark_name" text NOT NULL,
	"fund_house" text,
	"scheme_type" text,
	"scheme_category" text,
	"isin_growth" text,
	"isin_div_reinvestment" text,
	"last_fetched_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."benchmark_nav_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"benchmark_code" text NOT NULL,
	"date" text NOT NULL,
	"nav" double precision NOT NULL,
	"fetched_at" text NOT NULL,
	CONSTRAINT "benchmark_nav_history_code_date_uq" UNIQUE("benchmark_code","date")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."benchmark_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_pattern" text,
	"scheme_name_pattern" text,
	"benchmark_code" text NOT NULL,
	"benchmark_name" text NOT NULL,
	"benchmark_fund_name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"corpus_cr" double precision,
	"expense_ratio" double precision,
	"exit_load" text,
	"allocation_equity" double precision DEFAULT 0 NOT NULL,
	"allocation_debt" double precision DEFAULT 0 NOT NULL,
	"allocation_gold" double precision DEFAULT 0 NOT NULL,
	"allocation_global_equity" double precision DEFAULT 0 NOT NULL,
	"allocation_other" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."msfl_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"symbol" text NOT NULL,
	"quantity" double precision NOT NULL,
	"average_price" double precision NOT NULL,
	"current_price" double precision NOT NULL,
	"invested_value" double precision NOT NULL,
	"current_value" double precision NOT NULL,
	"unrealized_pnl" double precision NOT NULL,
	"unrealized_pnl_pct" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."msfl_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"as_of_date" text NOT NULL,
	"uploaded_at" text NOT NULL,
	"filename" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."msfl_scheme_nav_cache_meta" (
	"scheme_code" text PRIMARY KEY NOT NULL,
	"fund_house" text NOT NULL,
	"scheme_type" text NOT NULL,
	"scheme_category" text NOT NULL,
	"scheme_name" text NOT NULL,
	"isin_growth" text,
	"isin_div_reinvestment" text,
	"last_fetched_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."msfl_scheme_nav_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheme_code" text NOT NULL,
	"date" text NOT NULL,
	"nav" double precision NOT NULL,
	"fetched_at" text NOT NULL,
	CONSTRAINT "msfl_scheme_nav_history_code_date_uq" UNIQUE("scheme_code","date")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."msfl_schemes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"scheme_code_api" text,
	"mapped_at" text,
	CONSTRAINT "msfl_schemes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."zerodha_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"holding_type" text NOT NULL,
	"symbol" text NOT NULL,
	"isin" text NOT NULL,
	"sector" text,
	"instrument_type" text,
	"quantity" double precision NOT NULL,
	"average_price" double precision NOT NULL,
	"current_price" double precision NOT NULL,
	"invested_value" double precision NOT NULL,
	"current_value" double precision NOT NULL,
	"unrealized_pnl" double precision NOT NULL,
	"unrealized_pnl_pct" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."zerodha_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"as_of_date" text NOT NULL,
	"uploaded_at" text NOT NULL,
	"filename" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."zerodha_scheme_nav_cache_meta" (
	"scheme_code" text PRIMARY KEY NOT NULL,
	"fund_house" text NOT NULL,
	"scheme_type" text NOT NULL,
	"scheme_category" text NOT NULL,
	"scheme_name" text NOT NULL,
	"isin_growth" text,
	"isin_div_reinvestment" text,
	"last_fetched_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."zerodha_scheme_nav_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheme_code" text NOT NULL,
	"date" text NOT NULL,
	"nav" double precision NOT NULL,
	"fetched_at" text NOT NULL,
	CONSTRAINT "zerodha_scheme_nav_history_code_date_uq" UNIQUE("scheme_code","date")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."zerodha_schemes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"scheme_code_api" text,
	"mapped_at" text,
	CONSTRAINT "zerodha_schemes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_nav_cache_meta" ADD COLUMN "isin_growth" text;--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_nav_cache_meta" ADD COLUMN "isin_div_reinvestment" text;--> statement-breakpoint
ALTER TABLE "portfolio"."transactions" ADD COLUMN "folio_no" text;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_holdings" ADD CONSTRAINT "msfl_holdings_report_id_msfl_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "portfolio"."msfl_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD CONSTRAINT "zerodha_holdings_report_id_zerodha_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "portfolio"."zerodha_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "msfl_holdings_report_id_idx" ON "portfolio"."msfl_holdings" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "zerodha_holdings_report_id_idx" ON "portfolio"."zerodha_holdings" USING btree ("report_id");