ALTER TABLE "buyer_requests" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "expiry_reminded_at" timestamp with time zone;--> statement-breakpoint
UPDATE "buyer_requests" SET "expires_at" = GREATEST(COALESCE("confirmed_at", "created_at") + interval '30 days', now() + interval '7 days') WHERE "status" = 'active' AND "phone_hash" NOT LIKE 'demo-%';
