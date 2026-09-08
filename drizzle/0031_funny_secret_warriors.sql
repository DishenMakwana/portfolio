CREATE TABLE "portfolio"."zerodha_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"pan" text,
	"email" text,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "zerodha_members_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_reports" ADD COLUMN "member_id" integer;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_reports" ADD COLUMN "client_id" text DEFAULT 'SQY316' NOT NULL;--> statement-breakpoint
CREATE INDEX "zerodha_members_client_id_idx" ON "portfolio"."zerodha_members" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_reports" ADD CONSTRAINT "zerodha_reports_member_id_zerodha_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "portfolio"."zerodha_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zerodha_reports_client_id_idx" ON "portfolio"."zerodha_reports" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "zerodha_reports_member_id_idx" ON "portfolio"."zerodha_reports" USING btree ("member_id");