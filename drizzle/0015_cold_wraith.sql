CREATE TABLE "portfolio"."zerodha_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"scheme_id" integer,
	"folio_no" text,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"raw_transaction_type" text,
	"units" double precision NOT NULL,
	"nav" double precision NOT NULL,
	"amount" double precision NOT NULL,
	"broker" text,
	"uploaded_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_transactions" ADD CONSTRAINT "zerodha_transactions_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "portfolio"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_transactions" ADD CONSTRAINT "zerodha_transactions_scheme_id_zerodha_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "portfolio"."zerodha_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zerodha_transactions_member_id_idx" ON "portfolio"."zerodha_transactions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "zerodha_transactions_scheme_id_idx" ON "portfolio"."zerodha_transactions" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "zerodha_transactions_date_idx" ON "portfolio"."zerodha_transactions" USING btree ("date");