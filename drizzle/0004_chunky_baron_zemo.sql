ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "scheme_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_schemes" ADD COLUMN "isin" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_schemes" ADD COLUMN "holding_type" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_schemes" ADD COLUMN "sector" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_schemes" ADD COLUMN "instrument_type" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD CONSTRAINT "zerodha_holdings_scheme_id_zerodha_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "portfolio"."zerodha_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "holding_type";--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "symbol";--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "isin";--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "sector";--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "instrument_type";