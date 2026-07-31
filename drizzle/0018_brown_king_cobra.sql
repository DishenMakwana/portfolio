CREATE INDEX "benchmark_nav_history_benchmark_code_idx" ON "portfolio"."benchmark_nav_history" USING btree ("benchmark_code");--> statement-breakpoint
CREATE INDEX "msfl_scheme_nav_history_scheme_code_idx" ON "portfolio"."msfl_scheme_nav_history" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "scheme_nav_history_scheme_code_idx" ON "portfolio"."scheme_nav_history" USING btree ("scheme_code");--> statement-breakpoint
CREATE INDEX "zerodha_scheme_nav_history_scheme_code_idx" ON "portfolio"."zerodha_scheme_nav_history" USING btree ("scheme_code");