CREATE TABLE "portfolio"."scheme_category_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheme_code" text NOT NULL,
	"scheme_name" text NOT NULL,
	"category_name" text NOT NULL,
	"groww_slug" text,
	"annualised_data" text,
	"absolute_data" text,
	"advanced_ratios_data" text,
	"market_cap_data" text,
	"asset_allocation_data" text,
	"last_scraped_at" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scheme_category_rankings_scheme_code_unique" UNIQUE("scheme_code")
);
--> statement-breakpoint
CREATE INDEX "scheme_category_rankings_scheme_code_idx" ON "portfolio"."scheme_category_rankings" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "scheme_category_rankings_category_name_idx" ON "portfolio"."scheme_category_rankings" USING btree ("category_name");