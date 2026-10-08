ALTER TABLE "offers" ADD COLUMN "changes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "update_notified_at" timestamp with time zone;