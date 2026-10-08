CREATE TABLE "seller_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_reviews_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "withdraw_reason" text;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "budget_min_usd" integer;--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "year_min" integer;--> statement-breakpoint
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_reviews" ADD CONSTRAINT "seller_reviews_request_id_buyer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."buyer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seller_reviews_seller_idx" ON "seller_reviews" USING btree ("seller_id","created_at");