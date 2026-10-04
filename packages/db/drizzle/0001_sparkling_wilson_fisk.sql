CREATE TABLE "buyer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" integer NOT NULL,
	"model" text NOT NULL,
	"year_from" integer NOT NULL,
	"year_to" integer,
	"budget_usd" integer NOT NULL,
	"mileage_max_km" integer,
	"fuel" text NOT NULL,
	"import_ok" boolean NOT NULL,
	"region" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"phone_encrypted" text NOT NULL,
	"phone_hash" text NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"notify_via" text NOT NULL,
	"locale" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyer_requests_phone_idx" ON "buyer_requests" USING btree ("phone_hash","created_at");--> statement-breakpoint
CREATE INDEX "buyer_requests_status_idx" ON "buyer_requests" USING btree ("status","created_at");