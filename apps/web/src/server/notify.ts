import 'server-only';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { localePath } from '@avtoskop/core';
import { brands, buyerRequests } from '@avtoskop/db';
import { formatNumber, priceLabel, yearsLabel } from '@/components/requestFormat';
import { decryptContact } from './contact';
import { db } from './db';
import { sendTelegram, siteUrl } from './telegram';

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
export async function notifyBuyerOfOffer(requestId: string, offer: OfferSummary): Promise<void> {
  const b = await buyerChat(requestId);
  if (!b) return;
  const t = await getTranslations({ locale: b.locale, namespace: 'notify' });
  await sendTelegram(
    b.chatId,
    t('newOffer', {
      request: b.request,
      offer: `${offer.car}, ${offer.year}, ${priceLabel(b.locale, offer.priceUsd, offer.priceMaxUsd)}`,
      link: b.link,
    }),
  );
}

export async function notifyBuyerOfPriceDrop(
  requestId: string,
  offer: OfferSummary & { oldPriceUsd: number },
): Promise<void> {
  const b = await buyerChat(requestId);
  if (!b) return;
  const t = await getTranslations({ locale: b.locale, namespace: 'notify' });
  await sendTelegram(
    b.chatId,
    t('priceDrop', {
      request: b.request,
      car: `${offer.car}, ${offer.year}`,
      oldPrice: `$${formatNumber(b.locale, offer.oldPriceUsd)}`,
      newPrice: `$${formatNumber(b.locale, offer.priceUsd)}`,
      link: b.link,
    }),
  );
}
