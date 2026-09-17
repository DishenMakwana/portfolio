ALTER TABLE "portfolio"."watchlist_schemes" ADD COLUMN "instrument_type" text;--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_schemes" ADD COLUMN "symbol" text;--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_schemes" ADD COLUMN "exchange" text;--> statement-breakpoint
CREATE INDEX "watchlist_schemes_instrument_type_idx" ON "portfolio"."watchlist_schemes" USING btree ("instrument_type");