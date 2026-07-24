ALTER TABLE "trips" ADD COLUMN "custom_cover_image_url" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "use_custom_cover" boolean DEFAULT false NOT NULL;