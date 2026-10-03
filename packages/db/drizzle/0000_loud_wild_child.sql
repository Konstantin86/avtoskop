CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"autoria_id" integer,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug"),
	CONSTRAINT "brands_autoria_id_unique" UNIQUE("autoria_id")
);
--> statement-breakpoint
CREATE TABLE "listing_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" bigint NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price_usd" integer,
	"price_usd_min" integer,
	"price_usd_max" integer,
	"mileage_km" integer,
	"mileage_km_min" integer,
	"mileage_km_max" integer
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"model_id" integer NOT NULL,
	"url" text,
	"vin" text,
	"year" integer,
	"price_usd" integer,
	"price_usd_min" integer,
	"price_usd_max" integer,
	"mileage_km" integer,
	"mileage_km_min" integer,
	"mileage_km_max" integer,
	"fuel_code" integer,
	"gearbox_code" integer,
	"region_code" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"details" jsonb,
	"details_fetched_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"autoria_id" integer,
	CONSTRAINT "models_autoria_id_unique" UNIQUE("autoria_id")
);
--> statement-breakpoint
CREATE TABLE "source_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"endpoint" text NOT NULL,
	"params" jsonb NOT NULL,
	"status" integer,
	"from_cache" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_snapshots" ADD CONSTRAINT "listing_snapshots_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_snapshots_listing_idx" ON "listing_snapshots" USING btree ("listing_id","seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_source_idx" ON "listings" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "listings_model_active_idx" ON "listings" USING btree ("model_id","is_active");--> statement-breakpoint
CREATE INDEX "listings_vin_idx" ON "listings" USING btree ("vin");--> statement-breakpoint
CREATE UNIQUE INDEX "models_brand_slug_idx" ON "models" USING btree ("brand_id","slug");--> statement-breakpoint
CREATE INDEX "source_requests_source_time_idx" ON "source_requests" USING btree ("source","created_at");