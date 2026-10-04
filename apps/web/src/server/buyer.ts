import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { hashSecret } from '@avtoskop/core';
import { brands, buyerRequests, offers, sellers } from '@avtoskop/db';
import { db } from './db';

const KEY = /^[A-Za-z0-9_-]{20,64}$/;

// The buyer's own request, found by the secret in their private link.
export async function getRequestByKey(key: string) {
  if (!KEY.test(key)) return null;
  const [row] = await db
    .select({
      id: buyerRequests.id,
      brand: brands.name,
      model: buyerRequests.model,
      yearFrom: buyerRequests.yearFrom,
      yearTo: buyerRequests.yearTo,
      budgetUsd: buyerRequests.budgetUsd,
      fuel: buyerRequests.fuel,
      gearbox: buyerRequests.gearbox,
      region: buyerRequests.region,
      status: buyerRequests.status,
      createdAt: buyerRequests.createdAt,
    })
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(buyerRequests.accessHash, hashSecret(key)));
  return row ?? null;
}

export type OwnRequest = NonNullable<Awaited<ReturnType<typeof getRequestByKey>>>;

export async function listRequestOffers(requestId: string) {
  return db
    .select({
      id: offers.id,
      car: offers.car,
      year: offers.year,
      mileageKm: offers.mileageKm,
      priceUsd: offers.priceUsd,
      availability: offers.availability,
      etaWeeks: offers.etaWeeks,
      originCountry: offers.originCountry,
      link: offers.link,
      description: offers.description,
      status: offers.status,
      createdAt: offers.createdAt,
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
    .where(eq(offers.requestId, requestId))
    .orderBy(asc(offers.createdAt));
}

export async function markOffersShown(requestId: string): Promise<void> {
  await db
    .update(offers)
    .set({ status: 'shown' })
    .where(and(eq(offers.requestId, requestId), eq(offers.status, 'sent')));
}
