import { contactKey } from '@avtoskop/core';
import { buyerRequests, createDb } from '@avtoskop/db';
import { inArray, isNotNull } from 'drizzle-orm';
import { importWanted } from '../mvs/wanted.ts';
import { cleanUpPhotos } from '../photos/cleanup.ts';
import { createSellerAlerts } from './alerts.ts';
import { createExpiryJob } from './expiry.ts';
import { createPendingSender } from './pending.ts';
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
const siteUrl = env('SITE_URL').replace(/\/$/, '');
const alertSellers = createSellerAlerts(db, tg, siteUrl, log);
const handle = createBotHandler(db, tg, {
  contactKey: contactKey(process.env['REQUEST_CONTACT_KEY']),
  siteUrl,
  onPublished: (ids) =>
    alertSellers(ids).catch((error: Error) => log(`Seller alerts failed: ${error.message}`)),
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

// The bot process also keeps the wanted-vehicles list fresh: at start, then daily.
const DAY_MS = 24 * 60 * 60 * 1000;
const refreshWanted = () =>
  importWanted(db, log).catch((error: Error) =>
    log(`Wanted list refresh failed: ${error.message}`),
  );
// End-to-end tests seed the list themselves and skip the large download.
const wantedOn = process.env['WANTED_IMPORT'] !== 'off';
if (wantedOn) void refreshWanted();
const wantedTimer = setInterval(() => wantedOn && void refreshWanted(), DAY_MS);

// Hourly: remind buyers before a request expires, and close expired ones.
const runExpiry = createExpiryJob(db, tg, {
  contactKey: contactKey(process.env['REQUEST_CONTACT_KEY']),
  siteUrl,
  log,
});
const checkExpiry = () =>
  runExpiry().catch((error: Error) => log(`Expiry check failed: ${error.message}`));
void checkExpiry();
const expiryTimer = setInterval(checkExpiry, 60 * 60 * 1000);

// Every minute: buyer messages held back by quiet hours or the daily digest.
const sendPending = createPendingSender(db, tg, log);
const checkPending = () =>
  sendPending().catch((error: Error) => log(`Queued messages failed: ${error.message}`));
const pendingTimer = setInterval(checkPending, 60 * 1000);

// Every minute: after a buyer edits a request, alert sellers who match only now.
const runRealerts = async () => {
  // Taken off the queue first, so a slow send never alerts the same sellers twice.
  // Read before clearing: an update's returning gives the new, empty value.
  const pending = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: buyerRequests.id, before: buyerRequests.realertFrom })
      .from(buyerRequests)
      .where(isNotNull(buyerRequests.realertFrom))
      .for('update');
    if (rows.length > 0) {
      await tx
        .update(buyerRequests)
        .set({ realertFrom: null })
        .where(inArray(buyerRequests.id, rows.map((r) => r.id)));
    }
    return rows;
  });
  const previous = new Map(pending.flatMap((p) => (p.before ? [[p.id, p.before] as const] : [])));
  if (previous.size > 0) await alertSellers([...previous.keys()], previous);
};
const checkRealerts = () =>
  runRealerts().catch((error: Error) => log(`Re-alerts failed: ${error.message}`));
const realertTimer = setInterval(checkRealerts, 60 * 1000);

// Hourly: remove photos that were never sent with an offer, or belong to long-closed requests.
const runPhotoCleanup = () =>
  cleanUpPhotos(db, log).catch((error: Error) => log(`Photo cleanup failed: ${error.message}`));
void runPhotoCleanup();
const photoTimer = setInterval(runPhotoCleanup, 60 * 60 * 1000);

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
clearInterval(wantedTimer);
clearInterval(expiryTimer);
clearInterval(photoTimer);
clearInterval(realertTimer);
clearInterval(pendingTimer);
await close();
log('Bot stopped');
