import 'server-only';

// The web app only sends messages; the bot process (apps/jobs) reads them.
export async function sendTelegram(chatId: number, text: string): Promise<boolean> {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token || chatId <= 0) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
