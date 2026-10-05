import { and, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import { decryptContact, hashContact, hashSecret, localePath } from '@avtoskop/core';
import { brands, buyerRequests, loginTokens, users, type Db } from '@avtoskop/db';
import type { ReplyMarkup, Telegram, TelegramMessage } from './telegram.ts';
import { botText, requestLabel } from './texts.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELLER_LOCALE = 'uk';

interface Options {
  contactKey: Buffer;
  siteUrl: string;
  // Called with the ids of requests that just became public.
  onPublished?: (requestIds: string[]) => Promise<void>;
}

function askPhoneKeyboard(locale: string): ReplyMarkup {
  return {
    keyboard: [[{ text: botText(locale, 'sharePhone'), request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

interface BuyerRequest {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number | null;
  locale: string;
  status: string;
  phoneHash: string;
  phoneVerified: boolean;
  telegramChatId: number | null;
  accessKeyEncrypted: string | null;
}

const removeKeyboard: ReplyMarkup = { remove_keyboard: true };

function displayName(m: TelegramMessage): string {
  const from = m.from!;
  return [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 80);
}

// Seller sign-in (/start login_<code>) and buyer request confirmation (/start req_<id>).
// Both end with the person sharing their own contact; one shared contact completes both.
export function createBotHandler(
  db: Db,
  tg: Telegram,
  { contactKey, siteUrl, onPublished }: Options,
) {
  const requestColumns = {
    id: buyerRequests.id,
    brand: brands.name,
    model: buyerRequests.model,
    yearFrom: buyerRequests.yearFrom,
    yearTo: buyerRequests.yearTo,
    locale: buyerRequests.locale,
    status: buyerRequests.status,
    phoneHash: buyerRequests.phoneHash,
    phoneVerified: buyerRequests.phoneVerified,
    telegramChatId: buyerRequests.telegramChatId,
    accessKeyEncrypted: buyerRequests.accessKeyEncrypted,
  };

  async function sendLink(chatId: number, r: BuyerRequest): Promise<void> {
    if (!r.accessKeyEncrypted) return;
    const link =
      siteUrl + localePath(r.locale, `/my/${decryptContact(r.accessKeyEncrypted, contactKey)}`);
    await tg.sendMessage(chatId, botText(r.locale, 'requestLink', { link }));
  }

  // Confirms every unconfirmed request posted with this phone and links it to the chat.
  async function confirmRequests(chatId: number, phoneHash: string): Promise<BuyerRequest[]> {
    const confirmed = await db
      .update(buyerRequests)
      .set({
        phoneVerified: true,
        telegramChatId: chatId,
        confirmedAt: new Date(),
        status: sql`case when ${buyerRequests.status} = 'new' then 'active' else ${buyerRequests.status} end`,
      })
      .where(and(eq(buyerRequests.phoneHash, phoneHash), eq(buyerRequests.phoneVerified, false)))
      .returning({ id: buyerRequests.id });
    if (confirmed.length === 0) return [];
    return db
      .select(requestColumns)
      .from(buyerRequests)
      .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
      .where(
        inArray(
          buyerRequests.id,
          confirmed.map((c) => c.id),
        ),
      );
  }

  async function announceConfirmed(chatId: number, rows: BuyerRequest[]): Promise<void> {
    for (const r of rows) {
      await tg.sendMessage(
        chatId,
        botText(r.locale, 'requestConfirmed', { request: requestLabel(r) }),
        removeKeyboard,
      );
      await sendLink(chatId, r);
    }
    const published = rows.filter((r) => r.status === 'active').map((r) => r.id);
    // Seller alerts run in the background so the buyer's chat isn't held up.
    if (onPublished && published.length > 0) void onPublished(published).catch(() => {});
  }

  // A phone this Telegram account has already proven, as a seller or on an earlier request.
  async function knownPhoneHashes(telegramId: number): Promise<string[]> {
    const [user] = await db
      .select({ phoneHash: users.phoneHash })
      .from(users)
      .where(eq(users.telegramId, telegramId));
    const earlier = await db
      .selectDistinct({ phoneHash: buyerRequests.phoneHash })
      .from(buyerRequests)
      .where(
        and(eq(buyerRequests.telegramChatId, telegramId), eq(buyerRequests.phoneVerified, true)),
      );
    return [user?.phoneHash, ...earlier.map((e) => e.phoneHash)].filter((h): h is string =>
      Boolean(h),
    );
  }

  async function onStartLogin(m: TelegramMessage, code: string): Promise<void> {
    const chatId = m.chat.id;
    const [token] = await db
      .select()
      .from(loginTokens)
      .where(
        and(
          eq(loginTokens.id, hashSecret(code)),
          inArray(loginTokens.status, ['pending', 'awaiting_phone']),
          gt(loginTokens.expiresAt, new Date()),
        ),
      );
    if (!token) {
      await tg.sendMessage(chatId, botText(SELLER_LOCALE, 'loginExpired'));
      return;
    }

    // A phone proven earlier (as a seller, or by confirming a buyer request) needs no new share.
    const [known] = await db.select().from(users).where(eq(users.telegramId, m.from!.id));
    const provenHash = known?.phoneHash ?? (await knownPhoneHashes(m.from!.id))[0];
    if (provenHash) {
      const userId = known?.id ?? (await upsertUser(m, provenHash));
      await db
        .update(loginTokens)
        .set({ status: 'confirmed', telegramId: m.from!.id, userId })
        .where(eq(loginTokens.id, token.id));
      await tg.sendMessage(chatId, botText(SELLER_LOCALE, 'loginDoneKnown'), removeKeyboard);
      return;
    }

    await db
      .update(loginTokens)
      .set({ status: 'awaiting_phone', telegramId: m.from!.id })
      .where(eq(loginTokens.id, token.id));
    await tg.sendMessage(
      chatId,
      botText(SELLER_LOCALE, 'loginAskPhone'),
      askPhoneKeyboard(SELLER_LOCALE),
    );
  }

  async function onStartRequest(m: TelegramMessage, id: string): Promise<void> {
    const chatId = m.chat.id;
    const [r] = UUID.test(id)
      ? await db
          .select(requestColumns)
          .from(buyerRequests)
          .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
          .where(eq(buyerRequests.id, id))
      : [];
    if (!r || r.status === 'closed' || !r.accessKeyEncrypted) {
      await tg.sendMessage(chatId, botText(r?.locale ?? 'uk', 'requestNotFound'));
      return;
    }

    if (r.phoneVerified) {
      // Only the chat that confirmed the request gets its private link again.
      if (r.telegramChatId === m.from!.id) {
        await tg.sendMessage(
          chatId,
          botText(r.locale, 'requestAlready', { request: requestLabel(r) }),
        );
        await sendLink(chatId, r);
      } else {
        await tg.sendMessage(chatId, botText(r.locale, 'requestNotFound'));
      }
      return;
    }

    if ((await knownPhoneHashes(m.from!.id)).includes(r.phoneHash)) {
      await announceConfirmed(chatId, await confirmRequests(m.from!.id, r.phoneHash));
      return;
    }

    await tg.sendMessage(
      chatId,
      botText(r.locale, 'requestAskPhone', { request: requestLabel(r) }),
      askPhoneKeyboard(r.locale),
    );
  }

  async function upsertUser(m: TelegramMessage, phoneHash: string): Promise<string> {
    const from = m.from!;
    const [user] = await db
      .insert(users)
      .values({
        telegramId: from.id,
        telegramUsername: from.username ?? null,
        name: displayName(m),
        phoneHash,
      })
      .onConflictDoUpdate({
        target: users.telegramId,
        set: { telegramUsername: from.username ?? null, phoneHash },
      })
      .returning({ id: users.id });
    return user!.id;
  }

  async function listRequests(m: TelegramMessage): Promise<void> {
    const rows = await db
      .select(requestColumns)
      .from(buyerRequests)
      .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
      .where(
        and(
          eq(buyerRequests.telegramChatId, m.from!.id),
          eq(buyerRequests.phoneVerified, true),
          ne(buyerRequests.status, 'closed'),
        ),
      )
      .orderBy(desc(buyerRequests.createdAt))
      .limit(10);
    const locale = rows[0]?.locale ?? 'uk';
    if (rows.length === 0) {
      await tg.sendMessage(m.chat.id, botText(locale, 'noRequests'));
      return;
    }
    const lines = rows.map((r) =>
      r.accessKeyEncrypted
        ? `• ${requestLabel(r)}\n${siteUrl}${localePath(r.locale, `/my/${decryptContact(r.accessKeyEncrypted, contactKey)}`)}`
        : `• ${requestLabel(r)}`,
    );
    await tg.sendMessage(m.chat.id, [botText(locale, 'myRequests'), ...lines].join('\n\n'));
  }

  async function completeLogin(m: TelegramMessage, phoneHash: string): Promise<boolean> {
    const from = m.from!;
    const [token] = await db
      .select({ id: loginTokens.id })
      .from(loginTokens)
      .where(
        and(
          eq(loginTokens.telegramId, from.id),
          eq(loginTokens.status, 'awaiting_phone'),
          gt(loginTokens.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(loginTokens.createdAt))
      .limit(1);
    if (!token) return false;

    const userId = await upsertUser(m, phoneHash);
    await db
      .update(loginTokens)
      .set({ status: 'confirmed', userId })
      .where(eq(loginTokens.id, token.id));
    return true;
  }

  async function onContact(m: TelegramMessage): Promise<void> {
    const chatId = m.chat.id;
    // Telegram fills user_id only when people share their own contact.
    if (m.contact!.user_id !== m.from!.id) {
      await tg.sendMessage(chatId, botText('uk', 'ownPhoneOnly'), askPhoneKeyboard('uk'));
      return;
    }
    const phoneHash = hashContact(`+${m.contact!.phone_number.replace(/\D/g, '')}`, contactKey);

    const loggedIn = await completeLogin(m, phoneHash);
    const confirmed = await confirmRequests(m.from!.id, phoneHash);
    await announceConfirmed(chatId, confirmed);
    if (loggedIn) {
      await tg.sendMessage(chatId, botText(SELLER_LOCALE, 'loginDone'), removeKeyboard);
    }
    if (!loggedIn && confirmed.length === 0) {
      await tg.sendMessage(chatId, botText('uk', 'noMatch'), removeKeyboard);
    }
  }

  return async function handle(m: TelegramMessage): Promise<void> {
    if (m.chat.type !== 'private' || !m.from) return;
    if (m.contact) return onContact(m);
    const text = m.text ?? '';
    if (text.startsWith('/start')) {
      const payload = text.slice('/start'.length).trim();
      if (payload.startsWith('login_')) return onStartLogin(m, payload.slice('login_'.length));
      if (payload.startsWith('req_')) return onStartRequest(m, payload.slice('req_'.length));
    }
    if (text.startsWith('/requests')) return listRequests(m);
    await tg.sendMessage(m.chat.id, botText('uk', 'welcome'));
  };
}
