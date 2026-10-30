CREATE TABLE "portfolio"."ipo_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"broker" text NOT NULL,
	"member_name" text NOT NULL,
	"member_id" integer,
	"ipo_name" text NOT NULL,
	"symbol" text,
	"application_date" text,
	"allotment_date" text,
	"listing_date" text,
	"issue_price" double precision NOT NULL,
	"allotted_qty" integer NOT NULL,
	"total_invested" double precision NOT NULL,
	"total_sold_qty" integer NOT NULL,
	"gross_sell_amount" double precision NOT NULL,
	"avg_sell_price" double precision NOT NULL,
	"broker_charges" double precision DEFAULT 0 NOT NULL,
	"net_bank_credit" double precision NOT NULL,
	"net_profit" double precision NOT NULL,
	"return_pct" double precision NOT NULL,
	"status" text DEFAULT 'SOLD' NOT NULL,
	"notes" text,
	"source_file" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio"."ipo_sell_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"ipo_record_id" integer NOT NULL,
	"sell_price" double precision NOT NULL,
	"sell_qty" integer NOT NULL,
	"sell_amount" double precision NOT NULL,
	"trade_date" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio"."watchlist_schemes" ADD COLUMN "is_pinned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio"."ipo_sell_trades" ADD CONSTRAINT "ipo_sell_trades_ipo_record_id_ipo_records_id_fk" FOREIGN KEY ("ipo_record_id") REFERENCES "portfolio"."ipo_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ipo_records_broker_idx" ON "portfolio"."ipo_records" USING btree ("broker");--> statement-breakpoint
CREATE INDEX "ipo_records_member_idx" ON "portfolio"."ipo_records" USING btree ("member_name");--> statement-breakpoint
CREATE INDEX "ipo_records_name_idx" ON "portfolio"."ipo_records" USING btree ("ipo_name");--> statement-breakpoint
CREATE INDEX "ipo_sell_trades_record_idx" ON "portfolio"."ipo_sell_trades" USING btree ("ipo_record_id");