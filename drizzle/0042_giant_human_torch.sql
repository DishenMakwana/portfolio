CREATE TABLE "portfolio"."unlisted_instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"isin" text,
	"company_name" text,
	"reason" text DEFAULT 'DELISTED' NOT NULL,
	"last_known_price" double precision DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unlisted_instruments_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE INDEX "unlisted_instruments_symbol_idx" ON "portfolio"."unlisted_instruments" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "unlisted_instruments_isin_idx" ON "portfolio"."unlisted_instruments" USING btree ("isin");