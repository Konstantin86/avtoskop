import { expect, type BrowserContext, type Page } from '@playwright/test';
import postgres from 'postgres';
import { contactKey, encryptContact, hashContact, hashSecret, newSecret } from '@avtoskop/core';
import { BASE_URL, CONTACT_KEY, TELEGRAM_URL, TEST_DATABASE_URL } from '../src/env.ts';
import type { SentMessage } from '../src/fake-telegram.ts';

export const sql = postgres(TEST_DATABASE_URL, { max: 2, onnotice: () => {} });
const key = contactKey(CONTACT_KEY);

// Telegram ids unique to this run, so tests never see each other's messages.
let nextId = 100_000 + Math.floor(Math.random() * 1_000_000) * 10;
export const newTelegramId = () => (nextId += 1);

// ---- stand-in Telegram -------------------------------------------------------------------

export async function messagesTo(chatId: number): Promise<SentMessage[]> {
  const all = (await (await fetch(`${TELEGRAM_URL}/__messages`)).json()) as SentMessage[];
  return all.filter((m) => m.chatId === chatId);
}

// Waits until a message to this chat matches; returns it.
export async function waitForMessage(
  chatId: number,
  match: RegExp,
  ms = 15_000,
): Promise<SentMessage> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const hit = (await messagesTo(chatId)).find((m) => match.test(m.text));
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 250));
  }
  const got = (await messagesTo(chatId)).map((m) => m.text.split('\n')[0]).join(' | ');
  throw new Error(`No message to ${chatId} matching ${match}. Got: ${got || 'nothing'}`);
}

export async function expectNoMessage(chatId: number, match: RegExp, ms = 2_500) {
  await new Promise((r) => setTimeout(r, ms));
  expect((await messagesTo(chatId)).some((m) => match.test(m.text))).toBe(false);
}

// What a person does in the bot: /start with a payload, or sharing their own contact.
export async function botStart(userId: number, payload: string) {
  await pushUpdate(userId, { text: `/start ${payload}` });
}

export async function botShareContact(userId: number, phone: string) {
  await pushUpdate(userId, { contact: { phone_number: phone, user_id: userId } });
}

async function pushUpdate(userId: number, extra: Record<string, unknown>) {
  await fetch(`${TELEGRAM_URL}/__updates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message_id: Math.floor(Math.random() * 1e9),
      date: Math.floor(Date.now() / 1000),
      chat: { id: userId, type: 'private' },
      from: { id: userId, first_name: 'Test', is_bot: false },
      ...extra,
    }),
  });
}

// ---- people --------------------------------------------------------------------------------

export async function ensureUser(telegramId: number, name = 'Test User') {
  const [row] = await sql`
    insert into users (telegram_id, name) values (${telegramId}, ${name})
    on conflict (telegram_id) do update set name = excluded.name
    returning id`;
  return row!.id as string;
}

// Signs the browser in as this Telegram account by creating a session directly.
export async function signIn(context: BrowserContext, telegramId: number, name = 'Test User') {
  const userId = await ensureUser(telegramId, name);
  const token = newSecret(32);
  await sql`insert into sessions (id, user_id, expires_at)
            values (${hashSecret(token)}, ${userId}, now() + interval '1 day')`;
  await context.addCookies([{ name: 'avt_session', value: token, url: BASE_URL }]);
}

export interface SellerOptions {
  type?: 'importer' | 'dealer' | 'buyout' | 'owner';
  status?: 'pending' | 'verified';
  name?: string;
  region?: string;
  brandIds?: number[];
  serviceRegions?: string[];
  budgetMinUsd?: number | null;
  yearMin?: number | null;
}

export async function createSeller(telegramId: number, o: SellerOptions = {}) {
  const userId = await ensureUser(telegramId, o.name ?? 'Seller');
  const [row] = await sql`
    insert into sellers (user_id, type, name, region, status, brand_ids, service_regions,
                         budget_min_usd, year_min, countries)
    values (${userId}, ${o.type ?? 'importer'}, ${o.name ?? `Seller ${telegramId}`},
            ${o.region ?? 'kyiv'}, ${o.status ?? 'verified'}, ${o.brandIds ?? []},
            ${o.serviceRegions ?? []}, ${o.budgetMinUsd ?? null}, ${o.yearMin ?? null},
            ${o.type === 'importer' || !o.type ? ['us'] : []})
    on conflict (user_id) do update set name = excluded.name
    returning id`;
  return row!.id as string;
}

export async function brandId(name: string): Promise<number> {
  const [row] = await sql`select id from brands where name = ${name}`;
  return row!.id as number;
}

// ---- requests and offers -------------------------------------------------------------------

export interface RequestOptions {
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number | null;
  budgetUsd?: number;
  region?: string;
  importOk?: boolean;
  sellerTypes?: string[];
  wishes?: string[];
  buyerTelegramId?: number;
  // Off by default, so buyer messages never wait for the morning whatever time the tests run.
  quietHours?: boolean;
}

// A published request straight in the database, with its private key.
export async function createRequest(o: RequestOptions = {}) {
  const access = newSecret(24);
  const buyer = o.buyerTelegramId ?? newTelegramId();
  const phone = `+38050${String(buyer).slice(-7).padStart(7, '0')}`;
  const [row] = await sql`
    insert into buyer_requests (brand_id, model, year_from, year_to, budget_usd, region,
      import_ok, seller_types, wishes, fuels, gearbox, notes, notify_via, locale,
      phone_encrypted, phone_hash, phone_verified, telegram_chat_id, status, access_hash,
      access_key_encrypted, confirmed_at, expires_at, quiet_hours)
    values (${await brandId(o.brand ?? 'Toyota')}, ${o.model ?? 'RAV4'}, ${o.yearFrom ?? 2020},
      ${o.yearTo ?? null}, ${o.budgetUsd ?? 25000}, ${o.region ?? 'kyiv'}, ${o.importOk ?? true},
      ${o.sellerTypes ?? []}, ${o.wishes ?? []}, ${[]}, 'any', '', 'telegram', 'uk',
      ${encryptContact(phone, key)}, ${hashContact(phone, key)}, true, ${buyer}, 'active',
      ${hashSecret(access)}, ${encryptContact(access, key)}, now(), now() + interval '30 days',
      ${o.quietHours ?? false})
    returning id`;
  return { id: row!.id as string, key: access, buyer, phone };
}

// A request waiting for its buyer to confirm in the bot; confirming it alerts the sellers.
export async function publishViaBot(o: RequestOptions = {}) {
  const r = await createRequest(o);
  await sql`update buyer_requests set status = 'new', phone_verified = false, confirmed_at = null,
            expires_at = null where id = ${r.id}`;
  await botStart(r.buyer, `req_${r.id}`);
  await botShareContact(r.buyer, r.phone);
  await waitForMessage(r.buyer, /опубліковано/i);
  return r;
}

export interface OfferOptions {
  car?: string;
  year?: number;
  priceUsd?: number;
  mileageKm?: number | null;
  availability?: string;
  vin?: string | null;
  features?: string[];
  status?: string;
}

export async function createOffer(requestId: string, sellerId: string, o: OfferOptions = {}) {
  const [row] = await sql`
    insert into offers (request_id, seller_id, car, year, price_usd, mileage_km, availability,
                        vin, features, status)
    values (${requestId}, ${sellerId}, ${o.car ?? 'Toyota RAV4 Hybrid'}, ${o.year ?? 2021},
            ${o.priceUsd ?? 24000}, ${o.mileageKm ?? 50000}, ${o.availability ?? 'in_ukraine'},
            ${o.vin ?? null}, ${o.features ?? []}, ${o.status ?? 'sent'})
    returning id`;
  return row!.id as string;
}

// ---- form helpers --------------------------------------------------------------------------

export async function pickBrand(page: Page, name: string) {
  const field = page.locator('#brandId');
  await field.click();
  await field.fill(name);
  await page.getByRole('option', { name, exact: true }).first().click();
}

export async function fill(page: Page, name: string, value: string) {
  await page.locator(`[name="${name}"]`).first().fill(value);
}

// Segment and chip controls: the real input sits on top of its label, so check the input.
export async function choose(page: Page, name: string, value: string) {
  await page.locator(`input[name="${name}"][value="${value}"]`).check();
}
