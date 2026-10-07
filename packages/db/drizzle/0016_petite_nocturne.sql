CREATE TABLE "page_views" (
	"day" date NOT NULL,
	"page" text NOT NULL,
	"source" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "page_views_day_page_source_pk" PRIMARY KEY("day","page","source")
);
