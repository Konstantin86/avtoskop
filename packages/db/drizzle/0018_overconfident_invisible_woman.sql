ALTER TABLE "offers" ALTER COLUMN "mileage_km" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "price_max_usd" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "service_fee_usd" integer;