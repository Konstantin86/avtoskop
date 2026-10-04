ALTER TABLE "buyer_requests" ADD COLUMN "gearbox" text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "wishes" text[] DEFAULT '{}' NOT NULL;