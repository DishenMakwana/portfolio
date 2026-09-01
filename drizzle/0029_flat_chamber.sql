CREATE TABLE "portfolio"."benchmark_category_ratios" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_name" text NOT NULL,
	"source" text DEFAULT 'calculated_db' NOT NULL,
	"top5" text,
	"top20" text,
	"pe_ratio" double precision,
	"pb_ratio" double precision,
	"alpha" double precision,
	"beta" double precision,
	"sharpe" double precision,
	"sortino" double precision,
	"std_dev" double precision,
	"r_squared" double precision,
	"sample_fund_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "benchmark_category_ratios_category_name_unique" UNIQUE("category_name")
);
--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_category_rankings" ADD COLUMN "expense_ratio" double precision;--> statement-breakpoint
CREATE INDEX "benchmark_category_ratios_cat_name_idx" ON "portfolio"."benchmark_category_ratios" USING btree ("category_name");--> statement-breakpoint
CREATE INDEX "benchmark_category_ratios_source_idx" ON "portfolio"."benchmark_category_ratios" USING btree ("source");