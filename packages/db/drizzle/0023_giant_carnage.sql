ALTER TABLE "buyer_requests" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "recent_edits" timestamp with time zone[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "realert_from" jsonb;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "sellers_notified_at" timestamp with time zone;