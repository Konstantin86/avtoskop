import 'server-only';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import {
  changesWorthAMessage,
  diffOffer,
  localePath,
  mergeChanges,
  photoFileNames,
  type OfferChange,
  type OfferSnapshot,
  UPDATE_NOTE_MINUTES,
} from '@avtoskop/core';
import { brands, buyerRequests, offers } from '@avtoskop/db';
import { formatNumber, priceLabel, yearsLabel } from '@/components/requestFormat';
import { decryptContact } from './contact';
import { db } from './db';
import { photosForOffers, readPhotoFile } from './photos';
import { sendTelegram, sendTelegramPhoto, siteUrl } from './telegram';

interface OfferSummary {
  car: string;
  year: number;
  priceUsd: number;
  priceMaxUsd?: number | null;
}

async function buyerChat(requestId: string) {
  const [r] = await db
    .select({
      brand: brands.name,
      model: buyerRequests.model,
      yearFrom: buyerRequests.yearFrom,
      yearTo: buyerRequests.yearTo,
      locale: buyerRequests.locale,
      chatId: buyerRequests.telegramChatId,
      key: buyerRequests.accessKeyEncrypted,
    })
    .from(buyerRequests)
    .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
    .where(eq(buyerRequests.id, requestId));
  if (!r?.chatId || !r.key) return null;
  return {
    chatId: r.chatId,
    locale: r.locale,
    request: `${r.brand} ${r.model} ${yearsLabel(r)}`,
    link: siteUrl() + localePath(r.locale, `/my/${decryptContact(r.key)}`),
  };
}

// Tells a confirmed buyer about a new offer, with their private link.
// The message comes with the offer's main photo when it has one.
export async function notifyBuyerOfOffer(
  requestId: string,
  offer: OfferSummary & { offerId: string },
): Promise<void> {
  const b = await buyerChat(requestId);
  if (!b) return;
  const t = await getTranslations({ locale: b.locale, namespace: 'notify' });
  const text = t('newOffer', {
    request: b.request,
    offer: `${offer.car}, ${offer.year}, ${priceLabel(b.locale, offer.priceUsd, offer.priceMaxUsd)}`,
    link: b.link,
  });
  const main = (await photosForOffers([offer.offerId])).get(offer.offerId)?.[0];
  const file = main ? await readPhotoFile(photoFileNames(main.key).full) : null;
  if (file) await sendTelegramPhoto(b.chatId, file, text);
  else await sendTelegram(b.chatId, text);
}

type OfferRow = typeof offers.$inferSelect;
type SavedOffer = Pick<
  OfferRow,
  | 'car'
  | 'year'
  | 'mileageKm'
  | 'priceUsd'
  | 'priceMaxUsd'
  | 'serviceFeeUsd'
  | 'availability'
  | 'etaWeeks'
  | 'originCountry'
  | 'link'
  | 'description'
  | 'features'
  | 'vin'
> & { photoIds: string[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function snapshot(o: Omit<SavedOffer, 'photoIds'>, photoIds: string[]): OfferSnapshot {
  return {
    priceUsd: o.priceUsd,
    availability: o.availability,
    etaWeeks: o.etaWeeks,
    photoIds,
    details: [
      o.car,
      o.year,
      o.mileageKm,
      o.priceMaxUsd,
      o.serviceFeeUsd,
      o.originCountry,
      o.link,
      o.description,
      o.features,
      o.vin,
    ],
  };
}

// After a seller edits an offer: notes what changed for the buyer's page, and tells the
// buyer in Telegram about a new lowest price, an arrival in Ukraine or the first photos.
// Arrivals and photos send at most one message a day per offer; declined offers stay quiet.
export async function recordOfferUpdate(
  requestId: string,
  before: OfferRow,
  after: SavedOffer,
  photosBefore: string[],
): Promise<void> {
  const changes = diffOffer(snapshot(before, photosBefore), snapshot(after, after.photoIds));
  if (changes.length === 0) return;
  const seenLongAgo =
    before.changesSeenAt !== null &&
    Date.now() - before.changesSeenAt.getTime() > UPDATE_NOTE_MINUTES * 60_000;
  const unseen = mergeChanges(seenLongAgo ? [] : (before.changes as OfferChange[]), changes);

  const quiet = before.status === 'declined';
  const lastToldPrice = before.notifiedPriceUsd ?? before.priceUsd;
  const newLow = !quiet && after.priceUsd < lastToldPrice;
  const recentlyTold =
    before.updateNotifiedAt !== null && Date.now() - before.updateNotifiedAt.getTime() < DAY_MS;
  const extras = quiet || recentlyTold ? [] : changesWorthAMessage(changes, photosBefore.length);

  await db
    .update(offers)
    .set({
      changes: unseen,
      changesSeenAt: null,
      ...(newLow && { notifiedPriceUsd: after.priceUsd }),
      ...(extras.length > 0 && { updateNotifiedAt: new Date() }),
    })
    .where(eq(offers.id, before.id));
  if (!newLow && extras.length === 0) return;

  const b = await buyerChat(requestId);
  if (!b) return;
  const t = await getTranslations({ locale: b.locale, namespace: 'notify' });
  const lines = [
    newLow &&
      t('updatePrice', {
        oldPrice: `$${formatNumber(b.locale, lastToldPrice)}`,
        newPrice: priceLabel(b.locale, after.priceUsd, after.priceMaxUsd),
      }),
    extras.includes('arrived') && t('updateArrived'),
    extras.includes('firstPhotos') && t('updatePhotos', { count: after.photoIds.length }),
  ].filter(Boolean);
  const text = t('offerUpdate', {
    request: b.request,
    car: `${after.car}, ${after.year}`,
    changes: lines.join('\n'),
    link: b.link,
  });
  const main = extras.includes('firstPhotos')
    ? (await photosForOffers([before.id])).get(before.id)?.[0]
    : undefined;
  const file = main ? await readPhotoFile(photoFileNames(main.key).full) : null;
  if (file) await sendTelegramPhoto(b.chatId, file, text);
  else await sendTelegram(b.chatId, text);
}
