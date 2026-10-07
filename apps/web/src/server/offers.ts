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

export interface OfferTemplate {
  label: string;
  values: Record<string, string>;
}

// The seller's recent offers, to reuse when the same car suits another buyer.
export async function listOfferTemplates(sellerId: string, limit = 10): Promise<OfferTemplate[]> {
  const rows = await db
    .select()
    .from(offers)
    .where(eq(offers.sellerId, sellerId))
    .orderBy(desc(offers.updatedAt))
    .limit(50);
  const seen = new Set<string>();
  const templates: OfferTemplate[] = [];
  for (const o of rows) {
    const id = `${o.car}|${o.year}|${o.vin ?? ''}`;
    if (seen.has(id)) continue;
    seen.add(id);
    templates.push({
      label: `${o.car}, ${o.year} · $${o.priceUsd.toLocaleString('uk-UA')}`,
      values: {
        car: o.car,
        year: String(o.year),
        mileageKm: String(o.mileageKm),
        priceUsd: String(o.priceUsd),
        availability: o.availability,
        etaWeeks: o.etaWeeks ? String(o.etaWeeks) : '',
        originCountry: o.originCountry ?? '',
        link: o.link ?? '',
        description: o.description,
        features: o.features.join(','),
        vin: o.vin ?? '',
      },
    });
    if (templates.length === limit) break;
  }
  return templates;
}
