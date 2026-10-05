ALTER TABLE "offers" ADD COLUMN "notified_price_usd" integer;--> statement-breakpoint
UPDATE "offers" SET "notified_price_usd" = "price_usd" WHERE "notified_price_usd" IS NULL;
