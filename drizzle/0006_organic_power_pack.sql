CREATE INDEX "msfl_holdings_scheme_id_idx" ON "portfolio"."msfl_holdings" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "msfl_schemes_scheme_code_api_idx" ON "portfolio"."msfl_schemes" USING btree ("scheme_code_api");--> statement-breakpoint
CREATE INDEX "schemes_scheme_code_api_idx" ON "portfolio"."schemes" USING btree ("scheme_code_api");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "portfolio"."transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "zerodha_holdings_scheme_id_idx" ON "portfolio"."zerodha_holdings" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "zerodha_schemes_scheme_code_api_idx" ON "portfolio"."zerodha_schemes" USING btree ("scheme_code_api");