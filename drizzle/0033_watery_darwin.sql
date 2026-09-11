ALTER TABLE "portfolio"."watchlist_fund_analytics" ADD COLUMN "vro_risk_data" text;--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_fund_analytics" ADD COLUMN "vro_returns_data" text;--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_fund_analytics" ADD COLUMN "vro_portfolio_data" text;--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_fund_analytics" ADD COLUMN "last_vro_synced_at" text;--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_schemes" ADD COLUMN "vro_url" text;