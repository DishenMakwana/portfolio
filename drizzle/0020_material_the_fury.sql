CREATE INDEX "transactions_stt_idx" ON "portfolio"."transactions" USING btree ("stt");--> statement-breakpoint
CREATE INDEX "transactions_type_idx" ON "portfolio"."transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transactions_txn_type_idx" ON "portfolio"."transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "transactions_holding_lookup_idx" ON "portfolio"."transactions" USING btree ("member_id","scheme_id","folio_no","type");