ALTER TABLE "buyer_requests" ADD COLUMN "access_hash" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "contact_shared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phone_encrypted";--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_access_hash_unique" UNIQUE("access_hash");