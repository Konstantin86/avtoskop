ALTER TABLE "buyer_requests" ALTER COLUMN "phone_encrypted" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_requests" ALTER COLUMN "phone_hash" DROP NOT NULL;