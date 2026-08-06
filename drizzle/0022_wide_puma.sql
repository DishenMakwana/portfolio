CREATE TABLE "portfolio"."bullion_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"timestamp" double precision NOT NULL,
	"gold_price" double precision NOT NULL,
	"silver_price" double precision NOT NULL,
	"platinum_price" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bullion_history_date_uq" UNIQUE("date")
);
--> statement-breakpoint
CREATE INDEX "bullion_history_date_idx" ON "portfolio"."bullion_history" USING btree ("date");