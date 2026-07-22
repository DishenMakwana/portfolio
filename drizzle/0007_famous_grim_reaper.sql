ALTER TABLE "portfolio"."msfl_scheme_nav_cache_meta" ADD COLUMN "launch_date" text;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_scheme_nav_cache_meta" ADD COLUMN "corpus_cr" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_scheme_nav_cache_meta" ADD COLUMN "expense_ratio" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."msfl_scheme_nav_cache_meta" ADD COLUMN "exit_load" text;--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_nav_cache_meta" ADD COLUMN "launch_date" text;--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_nav_cache_meta" ADD COLUMN "corpus_cr" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_nav_cache_meta" ADD COLUMN "expense_ratio" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."scheme_nav_cache_meta" ADD COLUMN "exit_load" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_scheme_nav_cache_meta" ADD COLUMN "launch_date" text;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_scheme_nav_cache_meta" ADD COLUMN "corpus_cr" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_scheme_nav_cache_meta" ADD COLUMN "expense_ratio" double precision;--> statement-breakpoint
ALTER TABLE "portfolio"."zerodha_scheme_nav_cache_meta" ADD COLUMN "exit_load" text;