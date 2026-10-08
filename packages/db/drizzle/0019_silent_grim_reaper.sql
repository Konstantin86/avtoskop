CREATE TABLE "offer_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"offer_id" uuid,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offer_photos_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "offer_photos" ADD CONSTRAINT "offer_photos_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_photos" ADD CONSTRAINT "offer_photos_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "offer_photos_offer_idx" ON "offer_photos" USING btree ("offer_id","position");--> statement-breakpoint
CREATE INDEX "offer_photos_seller_idx" ON "offer_photos" USING btree ("seller_id","created_at");