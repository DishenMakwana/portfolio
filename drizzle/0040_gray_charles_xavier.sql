CREATE INDEX "bank_deposits_fy_date_id_idx" ON "portfolio"."bank_deposits" USING btree ("financial_year","deposit_date","id");--> statement-breakpoint
CREATE INDEX "bank_deposits_fy_account_month_idx" ON "portfolio"."bank_deposits" USING btree ("financial_year","person_bank_account_id","month");--> statement-breakpoint
CREATE INDEX "deposit_account_active_person_idx" ON "portfolio"."deposit_person_bank_accounts" USING btree ("is_active","person_id","bank_id");--> statement-breakpoint
CREATE INDEX "ipo_records_profit_id_idx" ON "portfolio"."ipo_records" USING btree ("net_profit","id");--> statement-breakpoint
CREATE INDEX "ipo_records_status_profit_idx" ON "portfolio"."ipo_records" USING btree ("status","net_profit");--> statement-breakpoint
CREATE INDEX "ipo_records_member_id_idx" ON "portfolio"."ipo_records" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "ipo_sell_trades_record_id_idx" ON "portfolio"."ipo_sell_trades" USING btree ("ipo_record_id","id");