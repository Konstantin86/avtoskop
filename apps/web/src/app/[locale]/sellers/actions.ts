'use server';

import { and, count, eq, gt, sql } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  localePath,
  makeMatchesBrand,
  offerInput,
  offerLimitPerDay,
  sellerProfileInput,
  sellerTypeAllowed,
  vinMismatches,
} from '@avtoskop/core';
import { brands, buyerRequests, offers, sellers } from '@avtoskop/db';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser, safeReturnTo } from '@/server/auth';
import { db } from '@/server/db';
import { feedbackUrl } from '@/server/contactLinks';
import { notifyBuyerOfOffer, recordOfferUpdate } from '@/server/notify';
import { offerPhotoIds, setOfferPhotos } from '@/server/photos';
import { sendTelegram, siteUrl } from '@/server/telegram';
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
  const [saved] = await db
    .insert(sellers)
    .values({ userId: user.userId, ...parsed.data })
    .onConflictDoUpdate({ target: sellers.userId, set: { ...parsed.data, updatedAt: new Date() } })
    .returning({ isNew: sql<boolean>`(xmax = 0)` });
  // A new seller gets a short how-to from the bot.
  if (saved?.isNew) {
    const t = await getTranslations({ locale: 'uk', namespace: 'notify' });
    const feedback = feedbackUrl();
    const text = [
      t('sellerWelcome', {
        name: parsed.data.name,
        link: siteUrl() + localePath('uk', '/account'),
      }),
      feedback ? t('sellerWelcomeVerify', { link: feedback }) : null,
    ]
      .filter(Boolean)
      .join('\n\n');
    await sendTelegram(user.telegramId, text);
  }

  redirect({ href: safeReturnTo(values['return']), locale: await getLocale() });
  return { errors: [], values };
}

export async function saveOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['features']);
  const user = await getCurrentUser();
  if (!user?.seller) return { errors: [], formError: 'generic', values };

  const requestId = values['requestId'] ?? '';
  const [request] = await db
    .select({
      id: buyerRequests.id,
      status: buyerRequests.status,
      brand: brands.name,
      sellerTypes: buyerRequests.sellerTypes,
    })
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(buyerRequests.id, requestId));
  if (!request || request.status !== 'active') {
    return { errors: [], formError: 'closed', values };
  }
  if (!sellerTypeAllowed(request.sellerTypes, user.seller.type)) {
    return { errors: [], formError: 'notAllowed', values };
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
    .select()
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

  // A VIN that doesn't fit the car or the requested brand is usually a typo: ask the seller
  // to check once, and accept the same VIN when they send it again.
  if (vin && vinDecoded && values['vinConfirmed'] !== vin) {
    const mismatch =
      vinMismatches(o, vinDecoded).length > 0 || !makeMatchesBrand(vinDecoded.make, request.brand);
    if (mismatch) {
      return {
        errors: [],
        formError: 'vinMismatch',
        values: {
          ...values,
          vinConfirmed: vin,
          vinCar: [vinDecoded.make, vinDecoded.model, vinDecoded.year].filter(Boolean).join(' '),
        },
      };
    }
  }

  const row = {
    car: o.car,
    year: o.year,
    mileageKm: o.mileageKm ?? null,
    priceUsd: o.priceUsd,
    priceMaxUsd: o.priceMaxUsd ?? null,
    priceCarUsd: o.priceCarUsd ?? null,
    priceDeliveryUsd: o.priceDeliveryUsd ?? null,
    priceCustomsUsd: o.priceCustomsUsd ?? null,
    priceRepairUsd: o.priceRepairUsd ?? null,
    serviceFeeUsd: o.serviceFeeUsd ?? null,
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
    .returning({ id: offers.id, isNew: sql<boolean>`(xmax = 0)` });
  const photosBefore = existing ? await offerPhotoIds(existing.id) : [];
  const photos = saved ? await setOfferPhotos(seller.id, saved.id, o.photos) : [];
  if (saved?.isNew) await notifyBuyerOfOffer(requestId, { ...row, offerId: saved.id });
  if (existing) {
    await recordOfferUpdate(requestId, existing, { ...row, photoIds: photos }, photosBefore);
  }

  redirect({
    // Only a new offer notifies the buyer; an edit just updates what they see on their page.
    href: { pathname: '/account', query: { sent: saved?.isNew ? 'new' : 'updated' } },
    locale: await getLocale(),
  });
  return { errors: [], values };
}
