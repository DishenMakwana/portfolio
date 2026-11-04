CREATE INDEX "benchmark_nav_history_code_date_nav_idx" ON "portfolio"."benchmark_nav_history" USING btree ("benchmark_code","date","nav");--> statement-breakpoint
CREATE INDEX "holdings_snapshot_report_val_idx" ON "portfolio"."holdings_snapshot" USING btree ("report_id","current_value");--> statement-breakpoint
CREATE INDEX "holdings_snapshot_report_scheme_idx" ON "portfolio"."holdings_snapshot" USING btree ("report_id","scheme_id");--> statement-breakpoint
CREATE INDEX "msfl_nav_history_code_date_nav_idx" ON "portfolio"."msfl_scheme_nav_history" USING btree ("scheme_code","date","nav");--> statement-breakpoint
CREATE INDEX "scheme_nav_history_code_date_nav_idx" ON "portfolio"."scheme_nav_history" USING btree ("scheme_code","date","nav");--> statement-breakpoint
CREATE INDEX "transactions_scheme_date_id_idx" ON "portfolio"."transactions" USING btree ("scheme_id","date","id");--> statement-breakpoint
CREATE INDEX "watchlist_nav_history_code_date_nav_idx" ON "portfolio"."watchlist_scheme_nav_history" USING btree ("scheme_code","date","nav");--> statement-breakpoint
CREATE INDEX "zerodha_nav_history_code_date_nav_idx" ON "portfolio"."zerodha_scheme_nav_history" USING btree ("scheme_code","date","nav");