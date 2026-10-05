ALTER TABLE "buyer_requests" ALTER COLUMN "fuel" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD COLUMN "fuels" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE "buyer_requests" SET "fuels" = ARRAY["fuel"] WHERE "fuel" IS NOT NULL AND "fuel" <> 'any';
