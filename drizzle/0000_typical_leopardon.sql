CREATE SCHEMA "portfolio";
--> statement-breakpoint
CREATE TABLE "portfolio"."family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pan" text,
	CONSTRAINT "family_members_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."holdings_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"member_id" integer,
	"scheme_id" integer,
	"folio_no" text NOT NULL,
	"balance_units" double precision NOT NULL,
	"purchase_nav" double precision NOT NULL,
	"purchase_value" double precision NOT NULL,
	"current_nav" double precision NOT NULL,
	"current_value" double precision NOT NULL,
	"dividend" double precision DEFAULT 0,
	"gain" double precision NOT NULL,
	"holding_days" integer NOT NULL,
	"absolute_return" double precision NOT NULL,
	"cagr" double precision NOT NULL,
	"comments" text
);
--> statement-breakpoint
CREATE TABLE "portfolio"."member_report_cagrs" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer,
	"member_id" integer,
	"cagr" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"as_of_date" text NOT NULL,
	"uploaded_at" text NOT NULL,
	"filename" text NOT NULL,
	"cagr" double precision
);
--> statement-breakpoint
CREATE TABLE "portfolio"."scheme_nav_cache_meta" (
	"scheme_code" text PRIMARY KEY NOT NULL,
	"fund_house" text NOT NULL,
	"scheme_type" text NOT NULL,
	"scheme_category" text NOT NULL,
	"scheme_name" text NOT NULL,
	"last_fetched_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."scheme_nav_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"scheme_code" text NOT NULL,
	"date" text NOT NULL,
	"nav" double precision NOT NULL,
	"fetched_at" text NOT NULL,
	CONSTRAINT "scheme_nav_history_code_date_uq" UNIQUE("scheme_code","date")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."schemes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"scheme_code_api" text,
	"mapped_at" text,
	CONSTRAINT "schemes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."sip_mandates" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"scheme_id" integer,
	"folio_no" text NOT NULL,
	"monthly_amount" double precision NOT NULL,
	"monthly_history" text,
	"start_month" text,
	"is_active" integer DEFAULT 1,
	"uploaded_at" text NOT NULL,
	"source_file" text
);
--> statement-breakpoint
CREATE TABLE "portfolio"."transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"scheme_id" integer,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"units" double precision NOT NULL,
	"nav" double precision NOT NULL,
	"amount" double precision NOT NULL,
	"source_report_id" integer
);
--> statement-breakpoint
ALTER TABLE "portfolio"."holdings_snapshot" ADD CONSTRAINT "holdings_snapshot_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "portfolio"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."holdings_snapshot" ADD CONSTRAINT "holdings_snapshot_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "portfolio"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."holdings_snapshot" ADD CONSTRAINT "holdings_snapshot_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "portfolio"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."member_report_cagrs" ADD CONSTRAINT "member_report_cagrs_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "portfolio"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."member_report_cagrs" ADD CONSTRAINT "member_report_cagrs_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "portfolio"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."sip_mandates" ADD CONSTRAINT "sip_mandates_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "portfolio"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."sip_mandates" ADD CONSTRAINT "sip_mandates_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "portfolio"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."transactions" ADD CONSTRAINT "transactions_member_id_family_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "portfolio"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."transactions" ADD CONSTRAINT "transactions_scheme_id_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "portfolio"."schemes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."transactions" ADD CONSTRAINT "transactions_source_report_id_reports_id_fk" FOREIGN KEY ("source_report_id") REFERENCES "portfolio"."reports"("id") ON DELETE no action ON UPDATE no action;