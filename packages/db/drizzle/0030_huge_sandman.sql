ALTER TABLE "reports" ADD COLUMN "seller_reply" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "seller_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "seller_reviews" ADD COLUMN "seller_reply" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_reviews" ADD COLUMN "seller_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "verify_evidence" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "verify_requested_at" timestamp with time zone;