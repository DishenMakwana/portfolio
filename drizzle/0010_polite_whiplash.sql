ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "frozen_quantity" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "pledged_quantity" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "pledge_setup_quantity" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "free_quantity" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "lockin_quantity" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "lockin_date" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" ADD COLUMN "balance_description" text;