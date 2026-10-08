import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { decryptContact, EXPIRY_REMINDER_DAYS, localePath } from '@avtoskop/core';
import { brands, buyerRequests, type Db } from '@avtoskop/db';
import type { Telegram } from './telegram.ts';
import { botText, requestLabel } from './texts.ts';

interface Options {
  contactKey: Buffer;
  siteUrl: string;
  log: (m: string) => void;
}

// Reminds buyers a few days before a request expires, then closes it. Runs hourly in the bot.
export function createExpiryJob(db: Db, tg: Telegram, { contactKey, siteUrl, log }: Options) {
  const columns = {
    id: buyerRequests.id,
    brand: brands.name,
    model: buyerRequests.model,
    yearFrom: buyerRequests.yearFrom,
    yearTo: buyerRequests.yearTo,
    locale: buyerRequests.locale,
    chatId: buyerRequests.telegramChatId,
    key: buyerRequests.accessKeyEncrypted,
    expiresAt: buyerRequests.expiresAt,
  };
  interface Row {
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number | null;
    locale: string;
    chatId: number | null;
    key: string | null;
    expiresAt: Date | null;
  }

  async function tell(r: Row, key: 'requestExpiring' | 'requestExpired') {
    if (!r.chatId || !r.key) return;
    const link = siteUrl + localePath(r.locale, `/my/${decryptContact(r.key, contactKey)}`);
    const date = r.expiresAt?.toLocaleDateString(r.locale === 'en' ? 'en-GB' : 'uk-UA') ?? '';
    await tg
      .sendMessage(
        r.chatId,
        botText(r.locale, key, {
          request: requestLabel(r),
          date,
          link,
        }),
      )
      .catch((error: Error) => log(`Expiry message failed: ${error.message}`));
  }

  return async function runExpiry(): Promise<void> {
    const now = new Date();
    const soon = new Date(now.getTime() + EXPIRY_REMINDER_DAYS * 86_400_000);
    const active = and(eq(buyerRequests.status, 'active'), isNotNull(buyerRequests.expiresAt));

    const expired = await db
      .update(buyerRequests)
      .set({ status: 'closed', closedAt: now })
      .where(and(active, lte(buyerRequests.expiresAt, now)))
      .returning({ id: buyerRequests.id });
    for (const { id } of expired) {
      const [r] = await db
        .select(columns)
        .from(buyerRequests)
        .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
        .where(eq(buyerRequests.id, id));
      if (r) await tell(r, 'requestExpired');
    }

    const reminded = await db
      .update(buyerRequests)
      .set({ expiryRemindedAt: now })
      .where(
        and(active, lte(buyerRequests.expiresAt, soon), isNull(buyerRequests.expiryRemindedAt)),
      )
      .returning({ id: buyerRequests.id });
    for (const { id } of reminded) {
      const [r] = await db
        .select(columns)
        .from(buyerRequests)
        .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
        .where(eq(buyerRequests.id, id));
      if (r) await tell(r, 'requestExpiring');
    }
    if (expired.length + reminded.length > 0) {
      log(`Expiry: ${expired.length} closed, ${reminded.length} reminded`);
    }
  };
}
