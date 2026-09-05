CREATE TYPE "public"."fx_rate_source" AS ENUM('feed', 'manual');--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"currency" text PRIMARY KEY NOT NULL,
	"rate_per_usd" double precision NOT NULL,
	"source" "fx_rate_source" DEFAULT 'feed' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
