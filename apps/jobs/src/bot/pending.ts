import { asc, lte } from 'drizzle-orm';
import { pendingMessages, type Db } from '@avtoskop/db';
import type { Telegram } from './telegram.ts';
import { botText } from './texts.ts';

const TELEGRAM_LIMIT = 4000;
const SEPARATOR = '\n\n— — —\n\n';

// Splits joined messages into parts Telegram accepts, never cutting one message in half.
export function packMessages(texts: string[], header: string): string[] {
  const parts: string[] = [];
  let current = header;
  for (const text of texts) {
    const next = current === header ? `${header}\n\n${text}` : `${current}${SEPARATOR}${text}`;
    if (next.length > TELEGRAM_LIMIT && current !== header) {
      parts.push(current);
      current = text;
    } else {
      current = next;
    }
  }
  parts.push(current);
  return parts;
}

// Sends buyer messages held back by quiet hours or the daily digest. Several for one chat
// arrive as one message. Rows are taken off the queue first, so nothing is sent twice.
export function createPendingSender(db: Db, tg: Telegram, log: (m: string) => void) {
  return async function sendDue(): Promise<void> {
    const due = await db
      .delete(pendingMessages)
      .where(lte(pendingMessages.sendAfter, new Date()))
      .returning({
        chatId: pendingMessages.chatId,
        text: pendingMessages.text,
        createdAt: pendingMessages.createdAt,
      });
    if (due.length === 0) return;
    const byChat = new Map<number, typeof due>();
    for (const row of due) byChat.set(row.chatId, [...(byChat.get(row.chatId) ?? []), row]);
    for (const [chatId, rows] of byChat) {
      rows.sort((a, z) => a.createdAt.getTime() - z.createdAt.getTime());
      const texts = rows.map((r) => r.text);
      const messages =
        texts.length === 1
          ? texts
          : packMessages(texts, botText('uk', 'pendingDigest', { count: String(texts.length) }));
      for (const text of messages) {
        await tg
          .sendMessage(chatId, text)
          .catch((error: Error) => log(`Queued message failed: ${error.message}`));
      }
    }
    log(`Sent ${due.length} queued message(s) to ${byChat.size} chat(s)`);
  };
}
