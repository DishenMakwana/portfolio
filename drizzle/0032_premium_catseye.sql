CREATE TABLE "portfolio"."watchlist_fund_analytics" (
	"scheme_code" text PRIMARY KEY NOT NULL,
	"scheme_name" text NOT NULL,
	"category_name" text,
	"groww_slug" text,
	"annualised_data" text,
	"absolute_data" text,
	"advanced_ratios_data" text,
	"market_cap_data" text,
	"asset_allocation_data" text,
	"exit_load_tax_data" text,
	"top_holdings_data" text,
	"last_synced_at" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."watchlist_scheme_nav_cache_meta" (
	"scheme_code" text PRIMARY KEY NOT NULL,
	"scheme_name" text NOT NULL,
	"fund_house" text,
	"category" text,
	"last_fetched_at" text NOT NULL,
	"first_nav_date" text,
	"last_nav_date" text,
	"last_nav" double precision,
	"prev_nav" double precision,
	"one_day_change_pct" double precision,
	"ath_nav" double precision,
	"ath_date" text,
	"drawdown_pct" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."watchlist_scheme_nav_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheme_code" text NOT NULL,
	"date" text NOT NULL,
	"nav" double precision NOT NULL,
	"fetched_at" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_scheme_nav_history_code_date_uq" UNIQUE("scheme_code","date")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."watchlist_schemes" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheme_code" text NOT NULL,
	"scheme_name" text NOT NULL,
	"fund_house" text,
	"category" text,
	"scheme_type" text,
	"isin" text,
	"launch_date" text,
	"aum_cr" double precision,
	"expense_ratio" double precision,
	"exit_load" text,
	"fund_manager" text,
	"benchmark_code" text,
	"benchmark_name" text,
	"groww_slug" text,
	"risk_rating" integer,
	"min_lumpsum" double precision,
	"min_sip" double precision,
	"target_dip_pct" double precision,
	"target_nav" double precision,
	"notes" text,
	"tags" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_schemes_scheme_code_unique" UNIQUE("scheme_code")
);
--> statement-breakpoint
CREATE INDEX "watchlist_fund_analytics_code_idx" ON "portfolio"."watchlist_fund_analytics" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "watchlist_scheme_nav_cache_meta_code_idx" ON "portfolio"."watchlist_scheme_nav_cache_meta" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "watchlist_scheme_nav_history_code_idx" ON "portfolio"."watchlist_scheme_nav_history" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "watchlist_scheme_nav_history_date_idx" ON "portfolio"."watchlist_scheme_nav_history" USING btree ("date");--> statement-breakpoint
CREATE INDEX "watchlist_schemes_scheme_code_idx" ON "portfolio"."watchlist_schemes" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "watchlist_schemes_category_idx" ON "portfolio"."watchlist_schemes" USING btree ("category");