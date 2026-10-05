ALTER TABLE "sellers" ADD COLUMN "brand_ids" integer[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "service_regions" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "alerts" boolean DEFAULT true NOT NULL;