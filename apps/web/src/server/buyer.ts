import 'server-only';
import { and, asc, count, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { hashSecret } from '@avtoskop/core';
import { brands, buyerRequests, offers, reports, sellers } from '@avtoskop/db';
import { decryptContact } from './contact';
import { db } from './db';

const KEY = /^[A-Za-z0-9_-]{20,64}$/;

// The buyer's own request, found by the secret in their private link.
export async function getRequestByKey(key: string) {
  if (!KEY.test(key)) return null;
  const [row] = await db
    .select({
      id: buyerRequests.id,
      brandId: buyerRequests.brandId,
      brand: brands.name,
      model: buyerRequests.model,
      yearFrom: buyerRequests.yearFrom,
      yearTo: buyerRequests.yearTo,
      budgetUsd: buyerRequests.budgetUsd,
      mileageMaxKm: buyerRequests.mileageMaxKm,
      fuels: buyerRequests.fuels,
      gearbox: buyerRequests.gearbox,
      wishes: buyerRequests.wishes,
      region: buyerRequests.region,
      importOk: buyerRequests.importOk,
      sellerTypes: buyerRequests.sellerTypes,
      notes: buyerRequests.notes,
      editedAt: buyerRequests.editedAt,
      recentEdits: buyerRequests.recentEdits,
      status: buyerRequests.status,
      phoneVerified: buyerRequests.phoneVerified,
      alertedSellers: buyerRequests.alertedSellers,
      expiresAt: buyerRequests.expiresAt,
      createdAt: buyerRequests.createdAt,
    })
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(buyerRequests.accessHash, hashSecret(key)));
  return row ?? null;
}

export type OwnRequest = NonNullable<Awaited<ReturnType<typeof getRequestByKey>>>;

export async function listRequestOffers(requestId: string) {
  return (
    db
      .select({
        id: offers.id,
        car: offers.car,
        year: offers.year,
        mileageKm: offers.mileageKm,
        priceUsd: offers.priceUsd,
        priceMaxUsd: offers.priceMaxUsd,
        serviceFeeUsd: offers.serviceFeeUsd,
        availability: offers.availability,
        etaWeeks: offers.etaWeeks,
        originCountry: offers.originCountry,
        link: offers.link,
        description: offers.description,
        features: offers.features,
        vin: offers.vin,
        vinDecoded: offers.vinDecoded,
        status: offers.status,
        changes: offers.changes,
        changesSeenAt: offers.changesSeenAt,
        createdAt: offers.createdAt,
        reported: isNotNull(reports.id).mapWith(Boolean),
        seller: {
          name: sellers.name,
          type: sellers.type,
          region: sellers.region,
          countries: sellers.countries,
          about: sellers.about,
          status: sellers.status,
        },
      })
      .from(offers)
      .innerJoin(sellers, eq(offers.sellerId, sellers.id))
      .leftJoin(reports, eq(reports.offerId, offers.id))
      // Offers from banned sellers disappear for buyers.
      .where(and(eq(offers.requestId, requestId), ne(sellers.status, 'banned')))
      .orderBy(asc(offers.createdAt))
  );
}

export async function markOffersShown(requestId: string): Promise<void> {
  await db
    .update(offers)
    .set({ status: 'shown' })
    .where(and(eq(offers.requestId, requestId), eq(offers.status, 'sent')));
  // The buyer has now seen the "updated" notes; they fade a few minutes later.
  await db
    .update(offers)
    .set({ changesSeenAt: new Date() })
    .where(
      and(
        eq(offers.requestId, requestId),
        isNull(offers.changesSeenAt),
        sql`${offers.changes} <> '[]'::jsonb`,
      ),
    );
}

// Requests the person confirmed in Telegram, which is how they are tied to an account.
export async function listUserRequests(telegramId: number) {
  const rows = await db
    .select({
      id: buyerRequests.id,
      brand: brands.name,
      model: buyerRequests.model,
      yearFrom: buyerRequests.yearFrom,
      yearTo: buyerRequests.yearTo,
      budgetUsd: buyerRequests.budgetUsd,
      region: buyerRequests.region,
      status: buyerRequests.status,
      createdAt: buyerRequests.createdAt,
      accessKeyEncrypted: buyerRequests.accessKeyEncrypted,
      offerCount: count(offers.id),
      newOfferCount: sql<number>`count(*) filter (where ${offers.status} = 'sent')`.mapWith(Number),
    })
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .leftJoin(offers, eq(offers.requestId, buyerRequests.id))
    .where(and(eq(buyerRequests.telegramChatId, telegramId), eq(buyerRequests.phoneVerified, true)))
    .groupBy(buyerRequests.id, brands.name)
    .orderBy(desc(buyerRequests.createdAt));
  return rows.map(({ accessKeyEncrypted, ...r }) => ({
    ...r,
    key: accessKeyEncrypted ? decryptContact(accessKeyEncrypted) : null,
  }));
}

// Offers the person hasn't opened yet, across all their confirmed requests. Shown in the header.
export async function countNewOffers(telegramId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(offers)
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(sellers, eq(offers.sellerId, sellers.id))
    .where(
      and(
        eq(buyerRequests.telegramChatId, telegramId),
        eq(buyerRequests.phoneVerified, true),
        eq(offers.status, 'sent'),
        ne(sellers.status, 'banned'),
      ),
    );
  return row?.n ?? 0;
}
