import { and, desc, eq, gt, inArray } from 'drizzle-orm';
import { hashContact, hashSecret } from '@avtoskop/core';
import { loginTokens, users, type Db } from '@avtoskop/db';
import type { Telegram, TelegramMessage } from './telegram.ts';

const TEXT = {
  welcome:
    'Вітаємо в Автоскопі! Щоб увійти як продавець, натисніть «Увійти через Telegram» на сайті.',
  expired:
    'Посилання для входу застаріло. Поверніться на сайт і натисніть «Увійти через Telegram» ще раз.',
  askPhone:
    'Щоб увійти, поділіться своїм номером телефону кнопкою нижче. Ми не зберігаємо сам номер — лише його захищений відбиток.\n\nЯкщо ви не входили на Автоскоп, просто проігноруйте це повідомлення.',
  sharePhone: 'Поділитися номером',
  ownPhoneOnly: 'Будь ласка, поділіться власним номером — кнопкою нижче.',
  done: 'Готово! Номер підтверджено. Поверніться на сайт — вхід завершиться автоматично.',
  doneKnown: 'Готово! Поверніться на сайт — вхід завершиться автоматично.',
  noLogin: 'Номер підтверджено. Щоб увійти, натисніть «Увійти через Telegram» на сайті.',
};

const askPhoneKeyboard = {
  keyboard: [[{ text: TEXT.sharePhone, request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

function displayName(m: TelegramMessage): string {
  const from = m.from!;
  return [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 80);
}

export function createLoginHandler(db: Db, tg: Telegram, contactKey: Buffer) {
  async function onStart(m: TelegramMessage, payload: string): Promise<void> {
    const chatId = m.chat.id;
    if (!payload.startsWith('login_')) {
      await tg.sendMessage(chatId, TEXT.welcome);
      return;
    }
    const [token] = await db
      .select()
      .from(loginTokens)
      .where(
        and(
          eq(loginTokens.id, hashSecret(payload.slice('login_'.length))),
          inArray(loginTokens.status, ['pending', 'awaiting_phone']),
          gt(loginTokens.expiresAt, new Date()),
        ),
      );
    if (!token) {
      await tg.sendMessage(chatId, TEXT.expired);
      return;
    }

    const [known] = await db.select().from(users).where(eq(users.telegramId, m.from!.id));
    if (known?.phoneHash) {
      await db
        .update(loginTokens)
        .set({ status: 'confirmed', telegramId: m.from!.id, userId: known.id })
        .where(eq(loginTokens.id, token.id));
      await tg.sendMessage(chatId, TEXT.doneKnown, { remove_keyboard: true });
      return;
    }

    await db
      .update(loginTokens)
      .set({ status: 'awaiting_phone', telegramId: m.from!.id })
      .where(eq(loginTokens.id, token.id));
    await tg.sendMessage(chatId, TEXT.askPhone, askPhoneKeyboard);
  }

  async function onContact(m: TelegramMessage): Promise<void> {
    const chatId = m.chat.id;
    const from = m.from!;
    // Telegram fills user_id only when people share their own contact.
    if (m.contact!.user_id !== from.id) {
      await tg.sendMessage(chatId, TEXT.ownPhoneOnly, askPhoneKeyboard);
      return;
    }
    const phone = `+${m.contact!.phone_number.replace(/\D/g, '')}`;
    const [user] = await db
      .insert(users)
      .values({
        telegramId: from.id,
        telegramUsername: from.username ?? null,
        name: displayName(m),
        phoneHash: hashContact(phone, contactKey),
      })
      .onConflictDoUpdate({
        target: users.telegramId,
        set: {
          telegramUsername: from.username ?? null,
          phoneHash: hashContact(phone, contactKey),
        },
      })
      .returning({ id: users.id });

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
    if (!token) {
      await tg.sendMessage(chatId, TEXT.noLogin, { remove_keyboard: true });
      return;
    }
    await db
      .update(loginTokens)
      .set({ status: 'confirmed', userId: user!.id })
      .where(eq(loginTokens.id, token.id));
    await tg.sendMessage(chatId, TEXT.done, { remove_keyboard: true });
  }

  return async function handle(m: TelegramMessage): Promise<void> {
    if (m.chat.type !== 'private' || !m.from) return;
    if (m.contact) return onContact(m);
    const text = m.text ?? '';
    if (text.startsWith('/start')) return onStart(m, text.slice('/start'.length).trim());
    await tg.sendMessage(m.chat.id, TEXT.welcome);
  };
}
