CREATE INDEX "holdings_snapshot_folio_report_id_idx" ON "portfolio"."holdings_snapshot" USING btree ("folio_no","report_id","id");--> statement-breakpoint
CREATE INDEX "msfl_holdings_trading_status_idx" ON "portfolio"."msfl_holdings" USING btree ("trading_status","scheme_id");--> statement-breakpoint
CREATE INDEX "transactions_folio_date_id_idx" ON "portfolio"."transactions" USING btree ("folio_no","date","id");--> statement-breakpoint
CREATE INDEX "transactions_date_id_idx" ON "portfolio"."transactions" USING btree ("date","id");