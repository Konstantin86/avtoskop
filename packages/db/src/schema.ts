import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  autoriaId: integer('autoria_id').unique(),
});

export const models = pgTable(
  'models',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    autoriaId: integer('autoria_id').unique(),
  },
  (t) => [uniqueIndex('models_brand_slug_idx').on(t.brandId, t.slug)],
);

// One ad on one site. Fields with _min/_max are bands learned from filtered searches;
// the exact value arrives with the listing details.
export const listings = pgTable(
  'listings',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    modelId: integer('model_id')
      .notNull()
      .references(() => models.id),
    url: text('url'),
    vin: text('vin'),
    year: integer('year'),
    priceUsd: integer('price_usd'),
    priceUsdMin: integer('price_usd_min'),
    priceUsdMax: integer('price_usd_max'),
    mileageKm: integer('mileage_km'),
    mileageKmMin: integer('mileage_km_min'),
    mileageKmMax: integer('mileage_km_max'),
    fuelCode: integer('fuel_code'),
    gearboxCode: integer('gearbox_code'),
    regionCode: integer('region_code'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
    details: jsonb('details'),
    detailsFetchedAt: timestamp('details_fetched_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('listings_source_idx').on(t.source, t.sourceId),
    index('listings_model_active_idx').on(t.modelId, t.isActive),
    index('listings_vin_idx').on(t.vin),
  ],
);

export const listingSnapshots = pgTable(
  'listing_snapshots',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    listingId: bigint('listing_id', { mode: 'number' })
      .notNull()
      .references(() => listings.id),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
    priceUsd: integer('price_usd'),
    priceUsdMin: integer('price_usd_min'),
    priceUsdMax: integer('price_usd_max'),
    mileageKm: integer('mileage_km'),
    mileageKmMin: integer('mileage_km_min'),
    mileageKmMax: integer('mileage_km_max'),
  },
  (t) => [index('listing_snapshots_listing_idx').on(t.listingId, t.seenAt)],
);

// Every call to an outside API, cached or not, so we can see quota use.
export const sourceRequests = pgTable(
  'source_requests',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    source: text('source').notNull(),
    endpoint: text('endpoint').notNull(),
    params: jsonb('params').notNull(),
    status: integer('status'),
    fromCache: boolean('from_cache').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('source_requests_source_time_idx').on(t.source, t.createdAt)],
);
