ALTER TABLE "portfolio"."holdings_snapshot" ADD COLUMN "isin" text;--> statement-breakpoint
ALTER TABLE "portfolio"."holdings_snapshot" ADD COLUMN "annualised_return" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "face_value" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "trading_status" text;