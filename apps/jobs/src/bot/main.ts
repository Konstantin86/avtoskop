import { contactKey } from '@avtoskop/core';
import { createDb } from '@avtoskop/db';
import { createLoginHandler } from './login.ts';
import { createTelegram } from './telegram.ts';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env`);
  return value;
}

const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const tg = createTelegram(env('TELEGRAM_BOT_TOKEN'));
const { db, close } = createDb(env('DATABASE_URL'));
const handle = createLoginHandler(db, tg, contactKey(process.env['REQUEST_CONTACT_KEY']));

let running = true;
process.on('SIGINT', () => (running = false));
process.on('SIGTERM', () => (running = false));

const me = await tg.getMe();
const expected = env('TELEGRAM_BOT_USERNAME').replace(/^@/, '');
if (me.username.toLowerCase() !== expected.toLowerCase()) {
  throw new Error(
    `TELEGRAM_BOT_USERNAME is @${expected}, but the token belongs to @${me.username}`,
  );
}
log(`Bot @${me.username} is running (long polling)`);

// Long polling needs no public URL, so the bot also runs on a laptop.
let offset = 0;
while (running) {
  try {
    const updates = await tg.getUpdates(offset, 25);
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
    log(`Polling error: ${(error as Error).message}; retrying in 5 s`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}
await close();
log('Bot stopped');
