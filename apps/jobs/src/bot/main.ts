import { contactKey } from '@avtoskop/core';
import { createDb } from '@avtoskop/db';
import { createBotHandler } from './handler.ts';
import { createTelegram } from './telegram.ts';
import { botText } from './texts.ts';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const tg = createTelegram(env('TELEGRAM_BOT_TOKEN'));
const { db, close } = createDb(env('DATABASE_URL'));
const handle = createBotHandler(db, tg, {
  contactKey: contactKey(process.env['REQUEST_CONTACT_KEY']),
  siteUrl: env('SITE_URL').replace(/\/$/, ''),
});

let running = true;
// Aborting the open long-poll request lets the bot exit at once, so a restarted
// bot doesn't overlap with this one (Telegram allows one poller per bot).
const shutdown = new AbortController();
const stop = () => {
  running = false;
  shutdown.abort();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const me = await tg.getMe();
const expected = env('TELEGRAM_BOT_USERNAME').replace(/^@/, '');
if (me.username.toLowerCase() !== expected.toLowerCase()) {
  throw new Error(
    `TELEGRAM_BOT_USERNAME is @${expected}, but the token belongs to @${me.username}`,
  );
}
// The command menu next to the message box; English for English Telegram, Ukrainian otherwise.
await tg.setMyCommands([{ command: 'requests', description: botText('uk', 'commandRequests') }]);
await tg.setMyCommands(
  [{ command: 'requests', description: botText('en', 'commandRequests') }],
  'en',
);
log(`Bot @${me.username} is running (long polling)`);

// Long polling needs no public URL, so the bot also runs on a laptop.
let offset = 0;
while (running) {
  try {
    const updates = await tg.getUpdates(offset, 25, shutdown.signal);
    for (const u of updates) {
      offset = u.update_id + 1;
      if (!u.message) continue;
      try {
        await handle(u.message);
      } catch (error) {
        log(`Failed to handle update ${u.update_id}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    if (!running) break;
    log(`Polling error: ${(error as Error).message}; retrying in 5 s`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
await close();
log('Bot stopped');
