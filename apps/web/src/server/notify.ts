import 'server-only';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { localePath } from '@avtoskop/core';
import { brands, buyerRequests } from '@avtoskop/db';
import { formatNumber, yearsLabel } from '@/components/requestFormat';
import { decryptContact } from './contact';
import { db } from './db';
import { sendTelegram, siteUrl } from './telegram';

interface OfferSummary {
  car: string;
  year: number;
  priceUsd: number;
}

// Tells a confirmed buyer about a new offer, with their private link.
export async function notifyBuyerOfOffer(requestId: string, offer: OfferSummary): Promise<void> {
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
  if (!r?.chatId || !r.key) return;

  const t = await getTranslations({ locale: r.locale, namespace: 'notify' });
  await sendTelegram(
    r.chatId,
    t('newOffer', {
      request: `${r.brand} ${r.model} ${yearsLabel(r)}`,
      offer: `${offer.car}, ${offer.year}, $${formatNumber(r.locale, offer.priceUsd)}`,
      link: siteUrl() + localePath(r.locale, `/my/${decryptContact(r.key)}`),
    }),
  );
}
