CREATE TABLE "portfolio"."sip_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sip_mandate_id" integer,
	"month" text NOT NULL,
	"amount" double precision NOT NULL,
	"uploaded_at" text NOT NULL,
	"source_file" text,
	CONSTRAINT "sip_mandate_month_unique" UNIQUE("sip_mandate_id","month")
);
--> statement-breakpoint
ALTER TABLE "portfolio"."sip_transactions" ADD CONSTRAINT "sip_transactions_sip_mandate_id_sip_mandates_id_fk" FOREIGN KEY ("sip_mandate_id") REFERENCES "portfolio"."sip_mandates"("id") ON DELETE cascade ON UPDATE no action;