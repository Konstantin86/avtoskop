import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { brands, buyerRequests, offers } from '@avtoskop/db';
import { priceLabel } from '@/components/requestFormat';
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
      priceMaxUsd: offers.priceMaxUsd,
      status: offers.status,
      withdrawReason: offers.withdrawReason,
      requestStatus: buyerRequests.status,
      closeReason: buyerRequests.closeReason,
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
    buyerPhone:
      row.status === 'contact_shared' && phoneEncrypted ? decryptContact(phoneEncrypted) : null,
  }));
}

type OfferRow = typeof offers.$inferSelect;
const optional = (n: number | null) => (n === null ? '' : String(n));

// An offer as offer-form values, for editing it or copying it into a new offer.
export function offerFormValues(o: OfferRow): Record<string, string> {
  return {
    car: o.car,
    year: String(o.year),
    mileageKm: optional(o.mileageKm),
    priceUsd: String(o.priceUsd),
    priceMaxUsd: optional(o.priceMaxUsd),
    priceCarUsd: optional(o.priceCarUsd),
    priceDeliveryUsd: optional(o.priceDeliveryUsd),
    priceCustomsUsd: optional(o.priceCustomsUsd),
    priceRepairUsd: optional(o.priceRepairUsd),
    serviceFeeUsd: optional(o.serviceFeeUsd),
    availability: o.availability,
    etaWeeks: optional(o.etaWeeks),
    originCountry: o.originCountry ?? '',
    link: o.link ?? '',
    description: o.description,
    features: o.features.join(','),
    vin: o.vin ?? '',
  };
}

export interface OfferTemplate {
  label: string;
  values: Record<string, string>;
}

const key = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Whether an earlier offer is about the same car as this request: it answered a request for the
// same brand and model, or its own car name mentions both ("Toyota RAV4 Hybrid" for a RAV4).
function sameCar(
  offer: { car: string; requestBrand: string; requestModel: string },
  target: { brand: string; model: string },
): boolean {
  const model = key(target.model);
  if (key(offer.requestBrand) === key(target.brand) && key(offer.requestModel) === model) {
    return true;
  }
  const car = key(offer.car);
  // Brand names can have several forms ("ВАЗ / Lada"); any of their words will do.
  const brandWords = target.brand
    .split(/[\s/]+/)
    .map(key)
    .filter((w) => w.length > 1);
  return model !== '' && car.includes(model) && brandWords.some((w) => car.includes(w));
}

// The seller's recent offers for the same car, to reuse when it suits another buyer.
export async function listOfferTemplates(
  sellerId: string,
  target: { brand: string; model: string },
  limit = 10,
): Promise<OfferTemplate[]> {
  const rows = await db
    .select({ offer: offers, requestBrand: brands.name, requestModel: buyerRequests.model })
    .from(offers)
    .innerJoin(buyerRequests, eq(offers.requestId, buyerRequests.id))
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(offers.sellerId, sellerId))
    .orderBy(desc(offers.updatedAt))
    .limit(50);
  const seen = new Set<string>();
  const templates: OfferTemplate[] = [];
  for (const { offer: o, requestBrand, requestModel } of rows) {
    if (!sameCar({ car: o.car, requestBrand, requestModel }, target)) continue;
    const id = `${o.car}|${o.year}|${o.vin ?? ''}`;
    if (seen.has(id)) continue;
    seen.add(id);
    templates.push({
      label: `${o.car}, ${o.year} · ${priceLabel('uk', o.priceUsd, o.priceMaxUsd)}`,
      values: offerFormValues(o),
    });
    if (templates.length === limit) break;
  }
  return templates;
}
