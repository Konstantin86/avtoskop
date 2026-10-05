CREATE TABLE "data_snapshots" (
	"source" text PRIMARY KEY NOT NULL,
	"as_of" timestamp with time zone,
	"file_modified" text,
	"rows" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wanted_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"vin" text NOT NULL,
	"brand_model" text NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"seized_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "vin" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "vin_decoded" jsonb;--> statement-breakpoint
CREATE INDEX "wanted_vehicles_vin_idx" ON "wanted_vehicles" USING btree ("vin");