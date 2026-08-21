CREATE SCHEMA IF NOT EXISTS "portfolio";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio"."analysis_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"domain" text NOT NULL,
	"favicon_url" text,
	"category" text DEFAULT 'General' NOT NULL,
	"pinned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analysis_links_category_idx" ON "portfolio"."analysis_links" USING btree ("category");--> statement-breakpoint
CREATE INDEX "analysis_links_created_at_idx" ON "portfolio"."analysis_links" USING btree ("created_at");