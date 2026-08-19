ALTER TABLE "portfolio"."msfl_schemes" ADD COLUMN "normalized_name" text;--> statement-breakpoint
ALTER TABLE "portfolio"."schemes" ADD COLUMN "normalized_name" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_schemes" ADD COLUMN "normalized_name" text;--> statement-breakpoint
CREATE INDEX "msfl_schemes_normalized_name_idx" ON "portfolio"."msfl_schemes" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "schemes_normalized_name_idx" ON "portfolio"."schemes" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "zerodha_schemes_normalized_name_idx" ON "portfolio"."zerodha_schemes" USING btree ("normalized_name");