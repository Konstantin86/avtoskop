import { mkdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { contactKey, photoFileNames } from '@avtoskop/core';
import { createDb } from '@avtoskop/db';
import { createExpiryJob } from '../../jobs/src/bot/expiry.ts';
import { createPendingSender } from '../../jobs/src/bot/pending.ts';
import { createTelegram, type Telegram } from '../../jobs/src/bot/telegram.ts';
import { importWanted, WANTED_URL } from '../../jobs/src/mvs/wanted.ts';
import { cleanUpPhotos } from '../../jobs/src/photos/cleanup.ts';
import {
  BASE_URL,
  BOT_TOKEN,
  CONTACT_KEY,
  PHOTO_DIR,
  TELEGRAM_URL,
  TEST_DATABASE_URL,
} from '../src/env.ts';
import { WANTED_VIN } from '../src/setup.ts';
import {
  createOffer,
  createRequest,
  createSeller,
  messagesTo,
  newTelegramId,
  sql,
  waitForMessage,
} from './helpers.ts';

// Plan section 10 and 2.9: the bot's background jobs, run directly against the test database.

process.env['TELEGRAM_API_URL'] = TELEGRAM_URL;
process.env['PHOTO_DIR'] = PHOTO_DIR;
const { db, close } = createDb(TEST_DATABASE_URL);
const tg = createTelegram(BOT_TOKEN);
const log = () => {};
test.afterAll(() => close());

test('2.9 expiry: reminder 3 days before, then closed; buyer and sellers told', async () => {
  const soon = await createRequest({ model: 'Expiring RAV4' });
  const due = await createRequest({ model: 'Expired RAV4' });
  const sellerTg = newTelegramId();
  await createOffer(due.id, await createSeller(sellerTg), { status: 'shown' });
  await sql`update buyer_requests set expires_at = now() + interval '2 days' where id = ${soon.id}`;
  await sql`update buyer_requests set expires_at = now() - interval '1 minute' where id = ${due.id}`;

  const runExpiry = createExpiryJob(db, tg, {
    contactKey: contactKey(CONTACT_KEY),
    siteUrl: BASE_URL,
    log,
  });
  await runExpiry();
  await runExpiry();

  const reminder = await waitForMessage(soon.buyer, /Expiring RAV4.*закриється/);
  expect(reminder.text).toContain(`/ua/my/${soon.key}`);
  await waitForMessage(due.buyer, /Expired RAV4.*закрито через 30 днів/);
  await waitForMessage(sellerTg, /покупець не продовжив/);
  // Running twice sends nothing twice.
  expect(await messagesTo(soon.buyer)).toHaveLength(1);
  expect(await messagesTo(due.buyer)).toHaveLength(1);
  const [row] = await sql`select status from buyer_requests where id = ${due.id}`;
  expect(row!.status).toBe('closed');
});

test('10.1 wanted-cars import: loads new VINs, skips an unchanged file, date shown on offers', async ({
  page,
}) => {
  const newVin = 'WVWZZZ1KZ9W000777';
  const modified = 'Mon, 05 Oct 2026 06:00:00 GMT';
  const file = JSON.stringify([
    { brandmodel: 'SKODA OCTAVIA', bodynumber: WANTED_VIN, insertdate: '2026-10-05T00:00:00' },
    { brandmodel: 'VOLKSWAGEN GOLF', bodynumber: newVin, insertdate: '2026-10-04T00:00:00' },
    { brandmodel: 'NO VIN', bodynumber: '12345' },
  ]);
  let downloads = 0;
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    expect(url).toBe(WANTED_URL);
    if (init?.method !== 'HEAD') downloads += 1;
    return new Response(init?.method === 'HEAD' ? null : file, {
      headers: { 'last-modified': modified },
    });
  }) as typeof fetch;

  expect(await importWanted(db, log, fakeFetch)).toBe(2);
  expect(await importWanted(db, log, fakeFetch)).toBeNull();
  expect(downloads).toBe(1);

  const r = await createRequest({ brand: 'Volkswagen', model: 'Golf' });
  await createOffer(r.id, await createSeller(newTelegramId()), { car: 'VW Golf', vin: newVin });
  await page.goto(`/ua/my/${r.key}`);
  await expect(page.locator('article')).toContainText('05.10');
  await expect(page.locator('article')).not.toContainText('Немає в базі розшуку');
});

test('10.2 photo cleanup removes old unsent uploads and photos of long-closed requests', async () => {
  await mkdir(PHOTO_DIR, { recursive: true });
  const sellerId = await createSeller(newTelegramId());
  const closed = await createRequest();
  const closedOffer = await createOffer(closed.id, sellerId);
  await sql`update buyer_requests set status = 'closed', closed_at = now() - interval '100 days'
            where id = ${closed.id}`;
  const open = await createRequest();
  const openOffer = await createOffer(open.id, sellerId);

  const keys = {
    oldUpload: `old${Date.now()}`,
    freshUpload: `fresh${Date.now()}`,
    closedPhoto: `closed${Date.now()}`,
    livePhoto: `live${Date.now()}`,
  };
  const rows: Array<[string, string | null, string]> = [
    [keys.oldUpload, null, '2 days'],
    [keys.freshUpload, null, '1 hour'],
    [keys.closedPhoto, closedOffer, '120 days'],
    [keys.livePhoto, openOffer, '120 days'],
  ];
  for (const [key, offerId, age] of rows) {
    await sql`insert into offer_photos (seller_id, offer_id, key, width, height, created_at)
              values (${sellerId}, ${offerId}, ${key}, 10, 10, now() - ${age}::interval)`;
    for (const name of Object.values(photoFileNames(key))) {
      await writeFile(join(PHOTO_DIR, name), 'x');
    }
  }

  await cleanUpPhotos(db, log);

  const left = (
    await sql`select key from offer_photos where key in ${sql(Object.values(keys))}`
  ).map((r) => r.key);
  expect(left.sort()).toEqual([keys.freshUpload, keys.livePhoto].sort());
  const exists = (key: string) =>
    stat(join(PHOTO_DIR, photoFileNames(key).full)).then(
      () => true,
      () => false,
    );
  expect(await exists(keys.oldUpload)).toBe(false);
  expect(await exists(keys.closedPhoto)).toBe(false);
  expect(await exists(keys.livePhoto)).toBe(true);
});

test('10.3 queued messages go out once, even with two senders at the same moment', async () => {
  const chat = newTelegramId();
  await sql`insert into pending_messages (chat_id, text, send_after, created_at) values
            (${chat}, 'Перше', now() - interval '1 minute', now() - interval '2 minutes'),
            (${chat}, 'Друге', now() - interval '1 minute', now() - interval '1 minute')`;
  const sent: string[] = [];
  const recorder = {
    sendMessage: async (chatId: number, text: string) => {
      if (chatId === chat) sent.push(text);
    },
  } as unknown as Telegram;
  // A second sender stands in for the bot restarting mid-run; the live bot may also race us.
  await Promise.all([
    createPendingSender(db, recorder, log)(),
    createPendingSender(db, recorder, log)(),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  const all = [...sent, ...(await messagesTo(chat)).map((m) => m.text)];
  expect(all).toHaveLength(1);
  expect(all[0]).toMatch(/Оновлення, поки вас не турбували \(2\)[\s\S]*Перше[\s\S]*Друге/);
});
