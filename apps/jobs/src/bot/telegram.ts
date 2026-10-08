import { z } from 'zod';

const user = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

const message = z
  .object({
    message_id: z.number(),
    chat: z.object({ id: z.number(), type: z.string() }),
    from: user.optional(),
    text: z.string().optional(),
    contact: z.object({ phone_number: z.string(), user_id: z.number().optional() }).optional(),
  })
  .loose();

const update = z.object({ update_id: z.number(), message: message.optional() }).loose();

export type TelegramUser = z.infer<typeof user>;
export type TelegramMessage = z.infer<typeof message>;

export interface ReplyMarkup {
  keyboard?: Array<Array<{ text: string; request_contact?: boolean }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
}

export function createTelegram(token: string, fetchFn: typeof fetch = fetch) {
  // TELEGRAM_API_URL points the bot at a stand-in server in end-to-end tests.
  const api = (process.env['TELEGRAM_API_URL'] || 'https://api.telegram.org').replace(/\/$/, '');
  const base = `${api}/bot${token}`;

  async function call<T>(
    method: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<T> {
    const res = await fetchFn(`${base}/${method}`, {
      ...(signal && { signal }),
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    return json.result as T;
  }

  return {
    async getUpdates(offset: number, timeoutSec = 30, signal?: AbortSignal) {
      const raw = await call<unknown[]>(
        'getUpdates',
        {
          offset,
          timeout: timeoutSec,
          allowed_updates: ['message'],
        },
        signal,
      );
      return z.array(update).parse(raw);
    },
    sendMessage(chatId: number, text: string, replyMarkup?: ReplyMarkup) {
      return call('sendMessage', {
        chat_id: chatId,
        text,
        ...(replyMarkup && { reply_markup: replyMarkup }),
      });
    },
    setMyCommands(
      commands: Array<{ command: string; description: string }>,
      languageCode?: string,
    ) {
      return call('setMyCommands', {
        commands,
        ...(languageCode && { language_code: languageCode }),
      });
    },
    getMe() {
      return call<{ username: string }>('getMe', {});
    },
  };
}

export type Telegram = ReturnType<typeof createTelegram>;
