import 'server-only';
import { and, count, desc, eq, inArray, notInArray, or } from 'drizzle-orm';
import { redactContacts, requestMatchesSeller } from '@avtoskop/core';
import { brands, buyerRequests, offers } from '@avtoskop/db';
import { db } from './db';

// Only requests whose phone the buyer confirmed in Telegram are shown publicly.
const VISIBLE_STATUSES = ['active'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Never select the phone columns here: these rows go to public pages.
const publicColumns = {
  id: buyerRequests.id,
  brand: brands.name,
  model: buyerRequests.model,
  yearFrom: buyerRequests.yearFrom,
  yearTo: buyerRequests.yearTo,
  budgetUsd: buyerRequests.budgetUsd,
  mileageMaxKm: buyerRequests.mileageMaxKm,
  fuels: buyerRequests.fuels,
  sellerTypes: buyerRequests.sellerTypes,
  gearbox: buyerRequests.gearbox,
  condition: buyerRequests.condition,
  wishes: buyerRequests.wishes,
  importOk: buyerRequests.importOk,
  region: buyerRequests.region,
  notes: buyerRequests.notes,
  createdAt: buyerRequests.createdAt,
  editedAt: buyerRequests.editedAt,
};

export type PublicRequest = Awaited<ReturnType<typeof listPublicRequests>>[number];

export interface BoardFilters {
  brandId?: number | undefined;
  region?: string | undefined;
  importOnly?: boolean | undefined;
}

function visible(filters: BoardFilters = {}) {
  return and(
    inArray(buyerRequests.status, VISIBLE_STATUSES),
    filters.brandId ? eq(buyerRequests.brandId, filters.brandId) : undefined,
    filters.region && filters.region !== 'all'
      ? or(eq(buyerRequests.region, filters.region), eq(buyerRequests.region, 'all'))
      : undefined,
    filters.importOnly ? eq(buyerRequests.importOk, true) : undefined,
  );
}

export async function listPublicRequests(filters: BoardFilters = {}, limit = 60) {
  const rows = await db
    .select(publicColumns)
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(visible(filters))
    .orderBy(desc(buyerRequests.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, notes: redactContacts(r.notes) }));
}

export async function countPublicRequests(filters: BoardFilters = {}): Promise<number> {
  const [row] = await db.select({ n: count() }).from(buyerRequests).where(visible(filters));
  return row?.n ?? 0;
}

export async function getPublicRequest(id: string): Promise<PublicRequest | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select(publicColumns)
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(and(eq(buyerRequests.id, id), visible()));
  return row ? { ...row, notes: redactContacts(row.notes) } : null;
}

interface SellerMatch {
  id: string;
  type: string;
  status: string;
  brandIds: number[];
  serviceRegions: string[];
}

// Open requests this seller could answer, by the same rules as the Telegram alerts,
// leaving out the ones they already sent an offer for.
export async function listRequestsForSeller(seller: SellerMatch, limit = 8) {
  const answered = db
    .select({ id: offers.requestId })
    .from(offers)
    .where(eq(offers.sellerId, seller.id));
  const rows = await db
    .select({ ...publicColumns, brandId: buyerRequests.brandId })
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(and(visible(), notInArray(buyerRequests.id, answered)))
    .orderBy(desc(buyerRequests.createdAt))
    .limit(200);
  return rows.filter((r) => requestMatchesSeller(r, { ...seller, alerts: true })).slice(0, limit);
}
