ALTER TABLE "buyer_requests" ADD COLUMN "access_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "telegram_chat_id" bigint;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "confirmed_at" timestamp with time zone;