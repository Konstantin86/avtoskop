import 'server-only';

// The web app only sends messages; the bot process (apps/jobs) reads them.
// TELEGRAM_API_URL points it at a stand-in server in end-to-end tests.
function apiBase(token: string): string {
  return `${(process.env['TELEGRAM_API_URL'] || 'https://api.telegram.org').replace(/\/$/, '')}/bot${token}`;
}

export async function sendTelegram(chatId: number, text: string): Promise<boolean> {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token || chatId <= 0) return false;
  try {
    const res = await fetch(`${apiBase(token)}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    });
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (!json.ok) console.error(`Telegram sendMessage failed: ${json.description}`);
    return json.ok;
  } catch (error) {
    console.error('Telegram sendMessage failed', error);
    return false;
  }
}

// A photo with a caption (up to 1024 characters), uploaded as a file because the
// server may not be reachable from Telegram. Falls back to plain text on failure.
export async function sendTelegramPhoto(
  chatId: number,
  photo: Buffer,
  caption: string,
): Promise<boolean> {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token || chatId <= 0) return false;
  if (caption.length > 1024) return sendTelegram(chatId, caption);
  try {
    const form = new FormData();
    form.set('chat_id', String(chatId));
    form.set('caption', caption);
    form.set('photo', new Blob([new Uint8Array(photo)], { type: 'image/webp' }), 'photo.webp');
    const res = await fetch(`${apiBase(token)}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    const json = (await res.json()) as { ok: boolean; description?: string };
    if (json.ok) return true;
    console.error(`Telegram sendPhoto failed: ${json.description}`);
  } catch (error) {
    console.error('Telegram sendPhoto failed', error);
  }
  return sendTelegram(chatId, caption);
}

export function botStartLink(payload: string): string | null {
  const bot = process.env['TELEGRAM_BOT_USERNAME'];
  return bot ? `https://t.me/${bot.replace(/^@/, '')}?start=${payload}` : null;
}

export function siteUrl(): string {
  return (process.env['SITE_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');
}

// Sends a note to every admin listed in ADMIN_TELEGRAM_IDS (complaint replies, badge requests).
export async function notifyAdmins(text: string): Promise<void> {
  const ids = (process.env['ADMIN_TELEGRAM_IDS'] ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  for (const id of ids) await sendTelegram(id, text);
}
