ALTER TABLE "portfolio"."msfl_holdings" ADD COLUMN "scheme_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_holdings" ADD CONSTRAINT "msfl_holdings_scheme_id_msfl_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "portfolio"."msfl_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_holdings" DROP COLUMN "symbol";