CREATE TABLE "portfolio"."bank_deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_bank_account_id" integer NOT NULL,
	"deposit_date" text NOT NULL,
	"financial_year" text NOT NULL,
	"month" integer NOT NULL,
	"amount" double precision NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."deposit_banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deposit_banks_bank_name_unique" UNIQUE("bank_name")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."deposit_monthly_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_bank_account_id" integer NOT NULL,
	"financial_year" text NOT NULL,
	"month" integer NOT NULL,
	"monthly_limit" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_account_fy_month_unique" UNIQUE("person_bank_account_id","financial_year","month")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."deposit_person_annual_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"financial_year" text NOT NULL,
	"annual_target_limit" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_fy_annual_limit_unique" UNIQUE("person_id","financial_year")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."deposit_person_bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"bank_id" integer NOT NULL,
	"account_identifier" text DEFAULT 'Default' NOT NULL,
	"account_number" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "person_bank_account_unique" UNIQUE("person_id","bank_id","account_identifier")
);
--> statement-breakpoint
CREATE TABLE "portfolio"."deposit_persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deposit_persons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "portfolio"."bank_deposits" ADD CONSTRAINT "bank_deposits_person_bank_account_id_deposit_person_bank_accounts_id_fk" FOREIGN KEY ("person_bank_account_id") REFERENCES "portfolio"."deposit_person_bank_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."deposit_monthly_limits" ADD CONSTRAINT "deposit_monthly_limits_person_bank_account_id_deposit_person_bank_accounts_id_fk" FOREIGN KEY ("person_bank_account_id") REFERENCES "portfolio"."deposit_person_bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."deposit_person_annual_limits" ADD CONSTRAINT "deposit_person_annual_limits_person_id_deposit_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "portfolio"."deposit_persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."deposit_person_bank_accounts" ADD CONSTRAINT "deposit_person_bank_accounts_person_id_deposit_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "portfolio"."deposit_persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio"."deposit_person_bank_accounts" ADD CONSTRAINT "deposit_person_bank_accounts_bank_id_deposit_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "portfolio"."deposit_banks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_deposits_account_idx" ON "portfolio"."bank_deposits" USING btree ("person_bank_account_id");--> statement-breakpoint
CREATE INDEX "bank_deposits_date_idx" ON "portfolio"."bank_deposits" USING btree ("deposit_date");--> statement-breakpoint
CREATE INDEX "bank_deposits_fy_month_idx" ON "portfolio"."bank_deposits" USING btree ("financial_year","month");--> statement-breakpoint
CREATE INDEX "deposit_limit_account_idx" ON "portfolio"."deposit_monthly_limits" USING btree ("person_bank_account_id");--> statement-breakpoint
CREATE INDEX "deposit_limit_fy_month_idx" ON "portfolio"."deposit_monthly_limits" USING btree ("financial_year","month");--> statement-breakpoint
CREATE INDEX "deposit_annual_person_idx" ON "portfolio"."deposit_person_annual_limits" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "deposit_annual_fy_idx" ON "portfolio"."deposit_person_annual_limits" USING btree ("financial_year");--> statement-breakpoint
CREATE INDEX "deposit_account_person_idx" ON "portfolio"."deposit_person_bank_accounts" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "deposit_account_bank_idx" ON "portfolio"."deposit_person_bank_accounts" USING btree ("bank_id");