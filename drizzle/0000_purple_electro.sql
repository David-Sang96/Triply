CREATE TYPE "public"."budget_level" AS ENUM('Budget', 'Mid-range', 'Luxury');--> statement-breakpoint
CREATE TYPE "public"."time_of_day" AS ENUM('morning', 'afternoon', 'evening');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('queued', 'generating', 'enriching', 'imaging', 'finalizing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"time_of_day" time_of_day NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"est_cost_usd" integer,
	"place_name" text,
	"lat" real,
	"lng" real,
	"place_verified" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"theme_title" text,
	CONSTRAINT "days_trip_day_unique" UNIQUE("trip_id","day_number")
);
--> statement-breakpoint
CREATE TABLE "place_cache" (
	"query" text PRIMARY KEY NOT NULL,
	"lat" real,
	"lng" real,
	"display_name" text,
	"raw" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"destination" text NOT NULL,
	"num_days" integer NOT NULL,
	"num_travelers" integer NOT NULL,
	"budget_level" "budget_level" NOT NULL,
	"interests" text[] NOT NULL,
	"pace" text,
	"title" text,
	"summary" text,
	"cover_image_url" text,
	"cover_image_photographer_name" text,
	"cover_image_photographer_url" text,
	"cover_image_unsplash_url" text,
	"images" jsonb,
	"status" "trip_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"counts_against_cap" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "days" ADD CONSTRAINT "days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;