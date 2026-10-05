'use server';

import { and, count, eq, gt, sql } from 'drizzle-orm';
import { getLocale } from 'next-intl/server';
import { offerInput, offerLimitPerDay, sellerProfileInput } from '@avtoskop/core';
import { buyerRequests, offers, sellers } from '@avtoskop/db';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, safeReturnTo } from '@/server/auth';
import { db } from '@/server/db';
import { notifyBuyerOfOffer, notifyBuyerOfPriceDrop } from '@/server/notify';
import { decodeVin } from '@/server/vin';

export interface FormState {
  errors: string[];
  formError?: string;
  values: Record<string, string>;
}

function formValues(formData: FormData, multi: string[] = []): Record<string, string> {
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'),
  ) as Record<string, string>;
  for (const key of multi) {
    values[key] = formData
      .getAll(key)
      .filter((v) => typeof v === 'string')
      .join(',');
  }
  return values;
}

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['countries', 'brandIds', 'serviceRegions']);
  const user = await getCurrentUser();
  if (!user) return { errors: [], formError: 'generic', values };

  const parsed = sellerProfileInput.safeParse(values);
  if (!parsed.success) {
    return {
      errors: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
      formError: 'generic',
      values,
    };
  }
  await db
    .insert(sellers)
    .values({ userId: user.userId, ...parsed.data })
    .onConflictDoUpdate({ target: sellers.userId, set: { ...parsed.data, updatedAt: new Date() } });

  redirect({ href: safeReturnTo(values['return']), locale: await getLocale() });
  return { errors: [], values };
}

export async function saveOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['features']);
  const user = await getCurrentUser();
  if (!user?.seller) return { errors: [], formError: 'generic', values };

  const requestId = values['requestId'] ?? '';
  const [request] = await db
    .select({ id: buyerRequests.id, status: buyerRequests.status })
    .from(buyerRequests)
    .where(eq(buyerRequests.id, requestId));
  if (!request || request.status !== 'active') {
    return { errors: [], formError: 'closed', values };
  }

  const parsed = offerInput.safeParse(values);
  if (!parsed.success) {
    return {
      errors: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
      formError: 'generic',
      values,
    };
  }
  const o = parsed.data;

  const seller = user.seller;
  if (seller.status === 'banned') return { errors: [], formError: 'banned', values };
  const [existing] = await db
    .select({
      id: offers.id,
      status: offers.status,
      priceUsd: offers.priceUsd,
      notifiedPriceUsd: offers.notifiedPriceUsd,
      vin: offers.vin,
      vinDecoded: offers.vinDecoded,
    })
    .from(offers)
    .where(and(eq(offers.requestId, requestId), eq(offers.sellerId, seller.id)));
  if (!existing) {
    const [today] = await db
      .select({ n: count() })
      .from(offers)
      .where(
        and(
          eq(offers.sellerId, seller.id),
          gt(offers.createdAt, new Date(Date.now() - 86_400_000)),
        ),
      );
    if ((today?.n ?? 0) >= offerLimitPerDay(seller.status)) {
      return { errors: [], formError: 'limit', values };
    }
  }

  // Decode only when the VIN is new or changed; the decoder is an outside service.
  const vin = o.vin ?? null;
  const vinDecoded =
    vin === null
      ? null
      : existing?.vin === vin && existing.vinDecoded
        ? existing.vinDecoded
        : await decodeVin(vin);

  const row = {
    car: o.car,
    year: o.year,
    mileageKm: o.mileageKm,
    priceUsd: o.priceUsd,
    availability: o.availability,
    etaWeeks: o.availability === 'in_ukraine' ? null : (o.etaWeeks ?? null),
    originCountry: o.originCountry ?? null,
    link: o.link ?? null,
    description: o.description,
    features: o.features,
    vin,
    vinDecoded,
  };
  const [saved] = await db
    .insert(offers)
    .values({ requestId, sellerId: seller.id, ...row, notifiedPriceUsd: row.priceUsd })
    .onConflictDoUpdate({
      target: [offers.requestId, offers.sellerId],
      set: { ...row, updatedAt: new Date() },
    })
    // xmax is 0 only for a freshly inserted row, so edits don't notify the buyer again.
    .returning({ isNew: sql<boolean>`(xmax = 0)` });
  if (saved?.isNew) await notifyBuyerOfOffer(requestId, row);

  // A lower price than the buyer last heard about is worth a message, unless they declined.
  const lastToldPrice = existing?.notifiedPriceUsd ?? existing?.priceUsd;
  if (existing && existing.status !== 'declined' && lastToldPrice && row.priceUsd < lastToldPrice) {
    await db
      .update(offers)
      .set({ notifiedPriceUsd: row.priceUsd })
      .where(eq(offers.id, existing.id));
    await notifyBuyerOfPriceDrop(requestId, { ...row, oldPriceUsd: lastToldPrice });
  }

  redirect({
    // Only a new offer notifies the buyer; an edit just updates what they see on their page.
    href: { pathname: '/account', query: { sent: saved?.isNew ? 'new' : 'updated' } },
    locale: await getLocale(),
  });
  return { errors: [], values };
}
