import { expect, test, type Page } from '@playwright/test';
import { WANTED_VIN } from '../src/setup.ts';
import {
  choose,
  createOffer,
  createRequest,
  createSeller,
  expectNoMessage,
  messagesTo,
  newTelegramId,
  signIn,
  sql,
  waitForMessage,
} from './helpers.ts';

// Plan section 3: what the buyer does with the offers on their private page.

const cards = (page: Page) => page.locator('article');
const card = (page: Page, car: string) => cards(page).filter({ hasText: car });
const spaces = (s: string) => s.replace(/\s/g, ' ');

async function carOrder(page: Page): Promise<string[]> {
  const texts = await cards(page).allInnerTexts();
  return texts.map((t) => t.split(',')[0]!.replace(/[★☆]/g, '').trim());
}

test('3.2 opening the page clears the badge and tells the seller once', async ({
  page,
  context,
}) => {
  const r = await createRequest();
  const sellerTg = newTelegramId();
  await createOffer(r.id, await createSeller(sellerTg), { car: 'Toyota RAV4 Viewed' });
  await signIn(context, r.buyer);
  await page.goto('/ua');
  const account = page.locator('header a[href$="/account"]').first();
  await expect(account).toContainText('1');
  await page.goto(`/ua/my/${r.key}`);
  await expect(card(page, 'Toyota RAV4 Viewed')).toBeVisible();
  await expect(account).not.toContainText('1');
  await waitForMessage(sellerTg, /Покупець переглянув/);
  await page.reload();
  await expectNoMessage(sellerTg, /Покупець переглянув[\s\S]*Покупець переглянув/);
  expect((await messagesTo(sellerTg)).filter((m) => /переглянув/.test(m.text))).toHaveLength(1);
});

test('3.3 the card shows price position, split, VIN checks, wishes and the seller', async ({
  page,
}) => {
  const r = await createRequest();
  await sql`update buyer_requests set wishes = ${['no_accidents', 'one_owner']} where id = ${r.id}`;
  const verified = await createSeller(newTelegramId(), { name: 'Перевірений Імпорт' });
  const fresh = await createSeller(newTelegramId(), {
    name: 'Новий Дилер',
    status: 'pending',
    type: 'dealer',
  });
  const cheap = await createOffer(r.id, verified, {
    car: 'RAV4 Cheap',
    priceUsd: 24000,
    vin: 'JTMW1RFV0KD000001',
    features: ['no_accidents'],
  });
  await sql`update offers set price_car_usd = 18000, price_delivery_usd = 2000 where id = ${cheap}`;
  await createOffer(r.id, fresh, { car: 'RAV4 Wanted', priceUsd: 25000, vin: WANTED_VIN });

  await page.goto(`/ua/my/${r.key}`);
  const a = card(page, 'RAV4 Cheap');
  const b = card(page, 'RAV4 Wanted');
  await expect(a).toContainText('найнижча ціна з 2');
  expect(spaces(await b.innerText())).toContain('на $1 000 дорожче за найдешевшу');
  expect(spaces(await a.innerText())).toMatch(/Складові ціни:.*\$18 000.*\$2 000.*інше \$4 000/);
  await expect(a).toContainText('Немає в базі розшуку МВС');
  await expect(b).not.toContainText('Немає в базі розшуку МВС');
  await expect(a).toContainText('1 з 2 ваших побажань');
  await expect(a).toContainText('Перевірений продавець');
  await expect(b).toContainText('Новий Дилер');
});

test('3.5–3.6 sort, star, starred filter and compare', async ({ page }) => {
  const r = await createRequest();
  await createOffer(r.id, await createSeller(newTelegramId()), { car: 'Mid', priceUsd: 25000 });
  await createOffer(r.id, await createSeller(newTelegramId()), { car: 'Low', priceUsd: 23000 });
  await createOffer(r.id, await createSeller(newTelegramId()), { car: 'High', priceUsd: 27000 });
  await createOffer(r.id, await createSeller(newTelegramId()), {
    car: 'Gone',
    priceUsd: 20000,
    status: 'withdrawn',
  });

  await page.goto(`/ua/my/${r.key}`);
  await page.getByRole('link', { name: 'Дешевші' }).click();
  await expect(page).toHaveURL(/sort=price/);
  await expect.poll(() => carOrder(page)).toEqual(['Low', 'Mid', 'High', 'Gone']);

  await card(page, 'Mid').getByRole('button', { name: 'Додати в обрані' }).click();
  await expect(card(page, 'Mid').getByRole('button', { name: 'Прибрати з обраних' })).toBeVisible();
  await card(page, 'High').getByRole('button', { name: 'Додати в обрані' }).click();
  await expect(
    card(page, 'High').getByRole('button', { name: 'Прибрати з обраних' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '★ Обрані (2)' }).click();
  await expect.poll(() => carOrder(page)).toEqual(['Mid', 'High']);

  await page.getByRole('link', { name: '★ Обрані (2)' }).click();
  await page.getByText('Порівняти пропозиції (3)').click();
  const heads = async () =>
    (await page.locator('table thead th').allInnerTexts()).map((h) => h.trim()).filter(Boolean);
  await expect.poll(heads).toEqual(['Low', '★ Mid', '★ High']);
});

test('3.7 asking for a missing detail tells the seller once', async ({ page }) => {
  const r = await createRequest();
  const sellerTg = newTelegramId();
  await createOffer(r.id, await createSeller(sellerTg), { car: 'Ask Me', vin: null });
  await page.goto(`/ua/my/${r.key}`);
  const c = card(page, 'Ask Me');
  await c.getByRole('button', { name: 'VIN', exact: true }).click();
  await expect(c.getByText('✓ VIN')).toBeVisible();
  const msg = await waitForMessage(sellerTg, /просить VIN авто/);
  expect(msg.text).toContain('Ask Me');
  await c.getByRole('button', { name: 'Більше фото' }).click();
  await waitForMessage(sellerTg, /просить більше фото/);
  expect((await messagesTo(sellerTg)).filter((m) => /VIN авто/.test(m.text))).toHaveLength(1);
});

test('3.8 a private note is saved for the buyer only', async ({ page }) => {
  const r = await createRequest();
  const offerId = await createOffer(r.id, await createSeller(newTelegramId()), { car: 'Noted' });
  await page.goto(`/ua/my/${r.key}`);
  const c = card(page, 'Noted');
  await c.getByText('Додати нотатку').click();
  await c.locator('textarea[name="note"]').fill('Подзвонити ввечері');
  await c.getByRole('button', { name: 'Зберегти' }).click();
  await expect(c.getByText('📝 Подзвонити ввечері')).toBeVisible();
  const [row] = await sql`select buyer_note from offers where id = ${offerId}`;
  expect(row!.buyer_note).toBe('Подзвонити ввечері');
});

test('3.9 sharing the number sends it to that seller only', async ({ page }) => {
  const r = await createRequest();
  const chosen = newTelegramId();
  const other = newTelegramId();
  await createOffer(r.id, await createSeller(chosen), { car: 'Chosen' });
  await createOffer(r.id, await createSeller(other), { car: 'Other' });
  await page.goto(`/ua/my/${r.key}`);
  await card(page, 'Chosen').getByRole('button', { name: 'Відкрити мій номер' }).click();
  await page.getByRole('button', { name: 'Так, відкрити номер' }).click();
  await expect(card(page, 'Chosen')).toContainText('Номер відкрито');
  const msg = await waitForMessage(chosen, /відкрив вам свій номер/);
  expect(msg.text).toContain(r.phone);
  await expectNoMessage(other, /відкрив вам свій номер/);
});

test('3.10 "Не цікаво" fades the card and "Повернути" restores it', async ({ page }) => {
  const r = await createRequest();
  const offerId = await createOffer(r.id, await createSeller(newTelegramId()), { car: 'Maybe' });
  await page.goto(`/ua/my/${r.key}`);
  const c = card(page, 'Maybe');
  await c.getByRole('button', { name: 'Не цікаво' }).click();
  await expect(c.getByText('Ви відхилили цю пропозицію.')).toBeVisible();
  await expect
    .poll(async () => (await sql`select status from offers where id = ${offerId}`)[0]!.status)
    .toBe('declined');
  await c.getByRole('button', { name: 'Повернути' }).click();
  await expect(c.getByRole('button', { name: 'Відкрити мій номер' })).toBeVisible();
  await expect
    .poll(async () => (await sql`select status from offers where id = ${offerId}`)[0]!.status)
    .toBe('shown');
});

test('3.11 a complaint declines the offer and tells the seller', async ({ page }) => {
  const r = await createRequest();
  const sellerTg = newTelegramId();
  const offerId = await createOffer(r.id, await createSeller(sellerTg), { car: 'Shady' });
  await page.goto(`/ua/my/${r.key}`);
  const c = card(page, 'Shady');
  await c.getByText('Поскаржитися на пропозицію').click();
  await c.locator('input[name="reason"][value="deposit"]').check();
  await c.locator('textarea[name="comment"]').fill('Просить передоплату');
  await c.getByRole('button', { name: 'Надіслати скаргу' }).click();
  await expect(c.getByText('Скаргу надіслано')).toBeVisible();
  const msg = await waitForMessage(sellerTg, /надійшла скарга/);
  expect(msg.text).toContain('Просить передоплату');
  const [row] =
    await sql`select o.status, r.reason from offers o join reports r on r.offer_id = o.id
                          where o.id = ${offerId}`;
  expect(row).toMatchObject({ status: 'declined', reason: 'deposit' });
});

test('3.14 a withdrawn offer is faded with the reason and cannot get the number', async ({
  page,
}) => {
  const r = await createRequest();
  const offerId = await createOffer(r.id, await createSeller(newTelegramId()), { car: 'Sold Car' });
  await sql`update offers set status = 'withdrawn', withdraw_reason = 'sold' where id = ${offerId}`;
  await page.goto(`/ua/my/${r.key}`);
  const c = card(page, 'Sold Car');
  await expect(c).toContainText('авто вже продано');
  await expect(c.getByRole('button', { name: 'Відкрити мій номер' })).toHaveCount(0);
});

test('3.15–3.16 closing as found here asks for a review; the rating links to the seller page', async ({
  page,
}) => {
  const r = await createRequest();
  const sellerTg = newTelegramId();
  const sellerId = await createSeller(sellerTg, { name: 'Чесний Продавець' });
  const offerId = await createOffer(r.id, sellerId, { car: 'Bought' });
  await sql`update offers set status = 'contact_shared', contact_shared_at = now() where id = ${offerId}`;
  await page.goto(`/ua/my/${r.key}`);
  await choose(page, 'reason', 'found_here');
  await page.getByRole('button', { name: 'Закрити запит' }).click();
  await expect(page.getByRole('heading', { name: 'Оцініть продавця' })).toBeVisible();
  await choose(page, 'rating', '5');
  await page
    .locator('form')
    .filter({ hasText: 'Оцініть продавця' })
    .locator('textarea')
    .fill('Все як в описі');
  await page.getByRole('button', { name: 'Надіслати відгук' }).click();
  await expect(page.getByRole('heading', { name: 'Оцініть продавця' })).toHaveCount(0);
  const msg = await waitForMessage(sellerTg, /залишив відгук/);
  expect(msg.text).toContain('5 з 5');

  const rating = card(page, 'Bought').getByRole('link', { name: /★ 5\.0/ });
  await expect(rating).toBeVisible();
  await rating.click();
  await expect(page.getByRole('heading', { name: 'Чесний Продавець' })).toBeVisible();
  await expect(page.getByText('Все як в описі')).toBeVisible();
});

test('3.17 the safety link opens the safe-buying page', async ({ page }) => {
  const r = await createRequest();
  await createOffer(r.id, await createSeller(newTelegramId()));
  await page.goto(`/ua/my/${r.key}`);
  await page.getByRole('link', { name: /Як купити авто безпечно/ }).click();
  await expect(page).toHaveURL(/\/ua\/safety/);
  await expect(page.locator('h1')).toBeVisible();
});
