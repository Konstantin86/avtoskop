import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { brands, buyerRequests, offers } from '@avtoskop/db';
import { decryptContact } from './contact';
import { db } from './db';

export async function getOwnOffer(requestId: string, sellerId: string) {
  const [row] = await db
    .select()
    .from(offers)
    .where(and(eq(offers.requestId, requestId), eq(offers.sellerId, sellerId)));
  return row ?? null;
}

// The buyer's phone is decrypted only for offers where the buyer chose to share it.
export async function listOwnOffers(sellerId: string) {
  const rows = await db
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
      phoneEncrypted: buyerRequests.phoneEncrypted,
    })
    .from(offers)
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(offers.sellerId, sellerId))
    .orderBy(desc(offers.updatedAt));
  return rows.map(({ phoneEncrypted, ...row }) => ({
    ...row,
    buyerPhone: row.status === 'contact_shared' ? decryptContact(phoneEncrypted) : null,
  }));
}
