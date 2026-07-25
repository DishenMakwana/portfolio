ALTER TABLE "portfolio"."msfl_holdings" ADD COLUMN "face_value" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_holdings" ADD COLUMN "trading_status" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "face_value";--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_holdings" DROP COLUMN "trading_status";