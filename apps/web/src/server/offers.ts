import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { brands, buyerRequests, offers } from '@avtoskop/db';
import { db } from './db';

export async function getOwnOffer(requestId: string, sellerId: string) {
  const [row] = await db
    .select()
    .from(offers)
    .where(and(eq(offers.requestId, requestId), eq(offers.sellerId, sellerId)));
  return row ?? null;
}

export async function listOwnOffers(sellerId: string) {
  return db
    .select({
      id: offers.id,
      requestId: offers.requestId,
      car: offers.car,
      year: offers.year,
      priceUsd: offers.priceUsd,
      status: offers.status,
      updatedAt: offers.updatedAt,
      requestBrand: brands.name,
      requestModel: buyerRequests.model,
    })
    .from(offers)
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(offers.sellerId, sellerId))
    .orderBy(desc(offers.updatedAt));
}
