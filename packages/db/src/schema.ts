import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

// The phone comes from the contact the buyer shares in Telegram, so it is empty until then.
// It is stored only encrypted; phone_hash lets us apply limits without decrypting.
export const buyerRequests = pgTable(
  'buyer_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id),
    model: text('model').notNull(),
    yearFrom: integer('year_from').notNull(),
    yearTo: integer('year_to'),
    budgetUsd: integer('budget_usd').notNull(),
    mileageMaxKm: integer('mileage_max_km'),
    // How many sellers got the new-request alert in Telegram.
    alertedSellers: integer('alerted_sellers').notNull().default(0),
    // Seller types allowed to reply; empty means everyone.
    sellerTypes: text('seller_types').array().notNull().default([]),
    // Empty means any fuel.
    fuels: text('fuels').array().notNull().default([]),
    gearbox: text('gearbox').notNull().default('any'),
    // 'any', 'new' or 'used'.
    condition: text('condition').notNull().default('any'),
    wishes: text('wishes').array().notNull().default([]),
    importOk: boolean('import_ok').notNull(),
    region: text('region').notNull(),
    notes: text('notes').notNull().default(''),
    phoneEncrypted: text('phone_encrypted'),
    phoneHash: text('phone_hash'),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    // The private link's secret: hashed for lookup, encrypted so the bot can resend the link.
    // Both are null for demo rows.
    accessHash: text('access_hash').unique(),
    accessKeyEncrypted: text('access_key_encrypted'),
    // Set when the buyer confirms the phone by sharing it with our Telegram bot.
    telegramChatId: bigint('telegram_chat_id', { mode: 'number' }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    // Confirmed requests close on their own at expiresAt (null: never, e.g. demo rows).
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    expiryRemindedAt: timestamp('expiry_reminded_at', { withTimezone: true }),
    // When the request was last closed; offer photos are removed some time after.
    closedAt: timestamp('closed_at', { withTimezone: true }),
    // Buyer edits: the last one (shown to sellers), and recent ones for the daily limit.
    editedAt: timestamp('edited_at', { withTimezone: true }),
    recentEdits: timestamp('recent_edits', { withTimezone: true }).array().notNull().default([]),
    // Region, import and seller types before an edit, until the bot alerts sellers who
    // match only now. Empty when there is nothing to send.
    realertFrom: jsonb('realert_from').$type<{
      brandId: number;
      sellerTypes: string[];
      region: string;
      importOk: boolean;
    }>(),
    // Last "the buyer changed the request" message to sellers with offers (one a day).
    sellersNotifiedAt: timestamp('sellers_notified_at', { withTimezone: true }),
    notifyVia: text('notify_via').notNull(),
    locale: text('locale').notNull(),
    status: text('status').notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('buyer_requests_phone_idx').on(t.phoneHash, t.createdAt),
    index('buyer_requests_status_idx').on(t.status, t.createdAt),
  ],
);

// A person signed in through the Telegram bot. The phone comes from Telegram's
// contact sharing, so it is verified. Only its keyed hash is kept, to spot
// duplicate or banned accounts; we reach sellers through their Telegram chat.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  telegramUsername: text('telegram_username'),
  name: text('name').notNull(),
  phoneHash: text('phone_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Only SHA-256 hashes of session and sign-in secrets are stored.
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

// pending -> awaiting_phone (bot saw /start) -> confirmed (phone shared) -> used (session created)
export const loginTokens = pgTable('login_tokens', {
  id: text('id').primaryKey(),
  status: text('status').notNull().default('pending'),
  telegramId: bigint('telegram_id', { mode: 'number' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  returnTo: text('return_to'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const sellers = pgTable('sellers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  countries: text('countries').array().notNull().default([]),
  about: text('about').notNull().default(''),
  // New-request alerts in Telegram; empty arrays mean all brands / all of Ukraine.
  brandIds: integer('brand_ids').array().notNull().default([]),
  serviceRegions: text('service_regions').array().notNull().default([]),
  alerts: boolean('alerts').notNull().default(true),
  // pending -> verified by an admin; banned sellers can't send offers and their offers are hidden.
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// One offer per seller per request; sending again updates it.
export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => buyerRequests.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    car: text('car').notNull(),
    year: integer('year').notNull(),
    mileageKm: integer('mileage_km'),
    priceUsd: integer('price_usd').notNull(),
    // Orders ('to_order') may quote a range (price_usd is the low end) and the seller's fee.
    priceMaxUsd: integer('price_max_usd'),
    serviceFeeUsd: integer('service_fee_usd'),
    availability: text('availability').notNull(),
    etaWeeks: integer('eta_weeks'),
    originCountry: text('origin_country'),
    link: text('link'),
    description: text('description').notNull().default(''),
    // Shown only to the buyer. vinDecoded holds make/model/year from the NHTSA decoder.
    vin: text('vin'),
    vinDecoded: jsonb('vin_decoded').$type<{ make: string; model: string; year: number | null }>(),
    // Seller's claims about the car: buyer wishes it meets plus offer extras (OFFER_FEATURES).
    features: text('features').array().notNull().default([]),
    status: text('status').notNull().default('sent'),
    // Lowest price the buyer was told about; a price-drop message needs a new low.
    notifiedPriceUsd: integer('notified_price_usd'),
    // Edits the buyer hasn't seen yet (OfferChange[]), cleared when they open their offers.
    changes: jsonb('changes').$type<Array<{ kind: string }>>().notNull().default([]),
    // When the buyer first saw these changes; the note stays a few minutes, then a new
    // edit starts a fresh list.
    changesSeenAt: timestamp('changes_seen_at', { withTimezone: true }),
    // Last "offer updated" Telegram message, so the buyer gets at most one a day per offer.
    updateNotifiedAt: timestamp('update_notified_at', { withTimezone: true }),
    contactSharedAt: timestamp('contact_shared_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('offers_request_seller_idx').on(t.requestId, t.sellerId),
    index('offers_seller_idx').on(t.sellerId, t.createdAt),
  ],
);

// A photo a seller uploaded. offer_id stays empty until the offer is sent; empty rows
// older than a day are removed together with their files.
export const offerPhotos = pgTable(
  'offer_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    offerId: uuid('offer_id').references(() => offers.id, { onDelete: 'set null' }),
    // Random file name in photo storage, never shown on public pages.
    key: text('key').notNull().unique(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('offer_photos_offer_idx').on(t.offerId, t.position),
    index('offer_photos_seller_idx').on(t.sellerId, t.createdAt),
  ],
);

// A buyer's complaint about an offer, reviewed on the admin page.
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    comment: text('comment').notNull().default(''),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('reports_offer_idx').on(t.offerId),
    index('reports_status_idx').on(t.status, t.createdAt),
  ],
);

// Cars the police are looking for, from MVS open data on data.gov.ua (only rows with a valid VIN).
export const wantedVehicles = pgTable(
  'wanted_vehicles',
  {
    id: serial('id').primaryKey(),
    vin: text('vin').notNull(),
    brandModel: text('brand_model').notNull(),
    color: text('color').notNull().default(''),
    seizedAt: timestamp('seized_at', { withTimezone: true }),
  },
  (t) => [index('wanted_vehicles_vin_idx').on(t.vin)],
);

// Anonymous visit counts per day, page type and traffic source: no cookies, no IP addresses.
export const pageViews = pgTable(
  'page_views',
  {
    day: date('day').notNull(),
    page: text('page').notNull(),
    source: text('source').notNull(),
    views: integer('views').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.page, t.source] })],
);

// When each bulk open-data source was last loaded, and how fresh its content is.
export const dataSnapshots = pgTable('data_snapshots', {
  source: text('source').primaryKey(),
  asOf: timestamp('as_of', { withTimezone: true }),
  fileModified: text('file_modified'),
  rows: integer('rows').notNull(),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
});

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
