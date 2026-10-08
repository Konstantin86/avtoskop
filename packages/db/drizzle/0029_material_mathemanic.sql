CREATE TABLE "pending_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" bigint NOT NULL,
	"text" text NOT NULL,
	"send_after" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "notify_mode" text DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "quiet_hours" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "buyer_starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "buyer_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "asks" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "pending_messages_due_idx" ON "pending_messages" USING btree ("send_after");