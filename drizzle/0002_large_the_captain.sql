CREATE INDEX "holdings_snapshot_report_id_idx" ON "portfolio"."holdings_snapshot" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "holdings_snapshot_member_id_idx" ON "portfolio"."holdings_snapshot" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "holdings_snapshot_scheme_id_idx" ON "portfolio"."holdings_snapshot" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "member_report_cagrs_report_id_idx" ON "portfolio"."member_report_cagrs" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "member_report_cagrs_member_id_idx" ON "portfolio"."member_report_cagrs" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "sip_mandates_member_id_idx" ON "portfolio"."sip_mandates" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "sip_mandates_scheme_id_idx" ON "portfolio"."sip_mandates" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "sip_transactions_sip_mandate_id_idx" ON "portfolio"."sip_transactions" USING btree ("sip_mandate_id");--> statement-breakpoint
CREATE INDEX "transactions_member_id_idx" ON "portfolio"."transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "transactions_scheme_id_idx" ON "portfolio"."transactions" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "transactions_source_report_id_idx" ON "portfolio"."transactions" USING btree ("source_report_id");