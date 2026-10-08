import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { ADMIN_TELEGRAM_ID } from '../src/env.ts';
import {
  botShareContact,
  botStart,
  brandId,
  choose,
  createOffer,
  createRequest,
  createSeller,
  expectNoMessage,
  fill,
  messagesTo,
  newTelegramId,
  publishViaBot,
  signIn,
  sql,
  waitForMessage,
  type SellerOptions,
} from './helpers.ts';

// Plan sections 4–6, plus the offer messages a buyer gets (3.1, 3.12, 3.13).

const spaces = (s: string) => s.replace(/\s/g, ' ');

async function seller(context: BrowserContext, o: SellerOptions = {}) {
  const tg = newTelegramId();
  const id = await createSeller(tg, o);
  await signIn(context, tg);
  return { tg, id };
}

async function openOfferForm(page: Page, requestId: string) {
  await page.goto(`/ua/requests/${requestId}/offer`);
  await expect(page.locator('input[name="car"]')).toBeVisible();
}

async function fillShortOffer(page: Page, car: string, year: string, price: string) {
  await fill(page, 'car', car);
  await fill(page, 'year', year);
  await fill(page, 'priceUsd', price);
}

async function openMore(page: Page) {
  const more = page.locator('details').filter({ has: page.locator('input[name="mileageKm"]') });
  if ((await more.getAttribute('open')) === null) await more.locator('summary').click();
}

const submit = (page: Page) => page.getByRole('button', { name: 'Надіслати пропозицію' }).click();
const sentOk = (page: Page) => expect(page.getByText('Пропозицію надіслано')).toBeVisible();

// A real PNG, taken from the browser itself.
async function pngFile(page: Page, name: string) {
  await page.setContent('<div style="width:64px;height:48px;background:#2a6"></div>');
  return { name, mimeType: 'image/png', buffer: await page.locator('div').screenshot() };
}

// ---- 4. account and profile -----------------------------------------------------------------

test('4.1–4.2 sign in through the bot; a known account needs no number', async ({ page }) => {
  const tg = newTelegramId();
  const signInOnce = async () => {
    await page.goto('/ua/login?return=/ua/requests');
    await page.getByRole('button', { name: 'Увійти через Telegram' }).click();
    const href = await page.getByRole('link', { name: 'Відкрити Telegram' }).getAttribute('href');
    const code = href!.split('start=login_')[1]!;
    await botStart(tg, `login_${code}`);
  };

  await signInOnce();
  await waitForMessage(tg, /поділіться своїм номером/);
  await botShareContact(tg, `+38067${String(tg).slice(-7)}`);
  await expect(page).toHaveURL(/\/ua\/requests/, { timeout: 15_000 });

  await page.context().clearCookies();
  await signInOnce();
  await waitForMessage(tg, /^Готово! Поверніться/);
  await expect(page).toHaveURL(/\/ua\/requests/, { timeout: 15_000 });
  expect((await messagesTo(tg)).filter((m) => /поділіться/.test(m.text))).toHaveLength(1);
});

test('4.3 creating a profile sends the welcome; countries only for importers', async ({
  page,
  context,
}) => {
  const tg = newTelegramId();
  await signIn(context, tg);
  await page.goto('/ua/sellers/profile');
  await choose(page, 'type', 'importer');
  await expect(page.locator('input[name="countries"]').first()).toBeVisible();
  await choose(page, 'type', 'dealer');
  await expect(page.locator('input[name="countries"]')).toHaveCount(0);
  await fill(page, 'name', 'Тест Дилер');
  await page.locator('select[name="region"]').selectOption('odesa');
  await page.getByRole('button', { name: 'Зберегти профіль' }).click();
  await expect(page).not.toHaveURL(/sellers\/profile/);
  await waitForMessage(tg, /Вітаємо в Автоскопі, Тест Дилер/);
  const [row] = await sql`select s.type, s.region from sellers s join users u on u.id = s.user_id
                          where u.telegram_id = ${tg}`;
  expect(row).toMatchObject({ type: 'dealer', region: 'odesa' });
});

test('4.4 alert filters are saved and cleared', async ({ page, context }) => {
  const s = await seller(context);
  const filters = async () =>
    (await sql`select budget_min_usd, year_min from sellers where id = ${s.id}`)[0];
  await page.goto('/ua/sellers/profile');
  await fill(page, 'budgetMinUsd', '15000');
  await fill(page, 'yearMin', '2018');
  await page.getByRole('button', { name: 'Зберегти профіль' }).click();
  await expect.poll(filters).toMatchObject({ budget_min_usd: 15000, year_min: 2018 });
  await page.goto('/ua/sellers/profile');
  await fill(page, 'budgetMinUsd', '');
  await fill(page, 'yearMin', '');
  await page.getByRole('button', { name: 'Зберегти профіль' }).click();
  await expect.poll(filters).toMatchObject({ budget_min_usd: null, year_min: null });
});

test('4.5 asking for the verified badge tells the admins', async ({ page, context }) => {
  await seller(context, { status: 'pending', name: 'Хоче Бейдж' });
  await page.goto('/ua/account');
  await page.locator('input[name="evidence"]').fill('12345678');
  await page.getByRole('button', { name: 'Надіслати на перевірку' }).click();
  await expect(page.getByText('Заявку на позначку надіслано (12345678)')).toBeVisible();
  const msg = await waitForMessage(ADMIN_TELEGRAM_ID, /Хоче Бейдж просить позначку/);
  expect(msg.text).toContain('12345678');
});

test('4.7 "Як вас бачать покупці" opens the own seller page', async ({ page, context }) => {
  await seller(context, { name: 'Мій Профіль' });
  await page.goto('/ua/account');
  await page.getByRole('link', { name: 'Як вас бачать покупці' }).click();
  await expect(page.getByRole('heading', { name: 'Мій Профіль' })).toBeVisible();
});

// ---- 5. alerts and the board ----------------------------------------------------------------

test('5.1–5.2 alerts reach matching sellers only', async () => {
  const toyota = await brandId('Toyota');
  const honda = await brandId('Honda');
  const match = newTelegramId();
  await createSeller(match, { type: 'dealer', brandIds: [toyota], serviceRegions: ['kyiv'] });
  const misses: Record<string, number> = {};
  const miss = async (label: string, o: SellerOptions, tg = newTelegramId()) => {
    misses[label] = tg;
    await createSeller(tg, o);
  };
  await miss('brand', { type: 'dealer', brandIds: [honda] });
  await miss('region', { type: 'dealer', brandIds: [toyota], serviceRegions: ['lviv'] });
  await miss('import', { type: 'importer', brandIds: [toyota] });
  await miss('type', { type: 'buyout', brandIds: [toyota] });
  await miss('budget', { type: 'dealer', brandIds: [toyota], budgetMinUsd: 30000 });
  await miss('year', { type: 'dealer', brandIds: [toyota], yearMin: 2024 });
  const buyer = newTelegramId();
  await miss('self', { type: 'dealer', brandIds: [toyota] }, buyer);

  const r = await publishViaBot({
    brand: 'Toyota',
    region: 'kyiv',
    importOk: false,
    sellerTypes: ['dealer', 'owner', 'importer'],
    budgetUsd: 25000,
    yearTo: 2022,
    buyerTelegramId: buyer,
  });
  const alert = await waitForMessage(match, /Новий запит від покупця/);
  expect(alert.text).toContain(`/ua/requests/${r.id}/offer`);
  for (const [label, tg] of Object.entries(misses)) {
    const got = (await messagesTo(tg)).some((m) => m.text.includes(r.id));
    expect(got, `seller ruled out by ${label} got the alert`).toBe(false);
  }
});

test('5.3 a seller who offered on the same car gets a copy link that fills the form', async ({
  page,
  context,
}) => {
  const s = await seller(context, { type: 'dealer', brandIds: [await brandId('Mazda')] });
  const old = await createRequest({ brand: 'Mazda', model: 'CX-5' });
  await createOffer(old.id, s.id, { car: 'Mazda CX-5 Touring', year: 2019, priceUsd: 19500 });
  const r = await publishViaBot({ brand: 'Mazda', model: 'CX-5' });
  const alert = await waitForMessage(s.tg, new RegExp(`Новий запит[\\s\\S]*${r.id}[\\s\\S]*⚡`));
  const link = alert.text.match(/⚡.*?(http\S+)/)![1]!;
  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(page.locator('input[name="car"]')).toHaveValue('Mazda CX-5 Touring');
  await expect(page.locator('input[name="priceUsd"]')).toHaveValue('19500');
});

test('5.4 board filters by brand and region', async ({ page }) => {
  const a = await createRequest({ brand: 'Subaru', region: 'volyn' });
  const b = await createRequest({ brand: 'Subaru', region: 'kyiv' });
  const c = await createRequest({ brand: 'Honda', region: 'volyn' });
  await page.goto(`/ua/requests?brand=${await brandId('Subaru')}&region=volyn`);
  await expect(page.locator(`a[href*="${a.id}"]`).first()).toBeVisible();
  await expect(page.locator(`a[href*="${b.id}"]`)).toHaveCount(0);
  await expect(page.locator(`a[href*="${c.id}"]`)).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('5.5 request page shows the edit date, offer count and offer button', async ({ page }) => {
  const r = await createRequest();
  await createOffer(r.id, await createSeller(newTelegramId()));
  await sql`update buyer_requests set edited_at = now() where id = ${r.id}`;
  await page.goto(`/ua/requests/${r.id}`);
  await expect(page.getByText(/Оновлено \d/)).toBeVisible();
  await expect(page.getByText('Пропозицій уже: 1')).toBeVisible();
  await page.getByRole('link', { name: 'Запропонувати авто' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/requests/${r.id}/offer`));
});

// ---- 6. offers ------------------------------------------------------------------------------

test('6.1 + 3.1 short offer with photos; the buyer gets the main photo', async ({
  page,
  context,
}) => {
  const r = await createRequest();
  await seller(context);
  const photos = [await pngFile(page, 'a.png'), await pngFile(page, 'b.png')];
  await openOfferForm(page, r.id);
  await fillShortOffer(page, 'Toyota RAV4 Photo', '2021', '24500');
  await page.locator('input[type="file"]').setInputFiles(photos);
  await expect(page.getByRole('button', { name: 'Видалити фото' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Надіслати пропозицію' })).toBeEnabled({
    timeout: 15_000,
  });
  await submit(page);
  await sentOk(page);
  const msg = await waitForMessage(r.buyer, /Нова пропозиція/);
  expect(msg.photo).toBe(true);
  expect(spaces(msg.text)).toContain('Toyota RAV4 Photo');
});

test('6.6 a non-image file shows a clear error', async ({ page, context }) => {
  const r = await createRequest();
  await seller(context);
  await openOfferForm(page, r.id);
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByText('Не вдалося прочитати фото')).toBeVisible();
  await page.getByRole('button', { name: 'Видалити фото' }).click();
  await expect(page.getByText('Не вдалося прочитати фото')).toHaveCount(0);
});

test('6.2 "В дорозі" needs the weeks', async ({ page, context }) => {
  const r = await createRequest();
  await seller(context);
  await openOfferForm(page, r.id);
  await fillShortOffer(page, 'Toyota RAV4', '2021', '24000');
  await choose(page, 'availability', 'in_transit');
  await submit(page);
  await expect(page.getByText('Вкажіть термін для авто')).toBeVisible();
});

test('6.3 sourcing to order with a price range', async ({ page, context }) => {
  const r = await createRequest();
  await seller(context);
  await openOfferForm(page, r.id);
  await page.locator('input[name="kind"]').nth(1).check();
  await expect(page.locator('input[name="vin"]')).toHaveCount(0);
  await fillShortOffer(page, 'Toyota RAV4 з аукціону', '2020', '21000');
  await fill(page, 'priceMaxUsd', '24000');
  await fill(page, 'etaWeeks', '8');
  await submit(page);
  await sentOk(page);
  await page.goto(`/ua/my/${r.key}`);
  const c = page.locator('article').filter({ hasText: 'з аукціону' });
  expect(spaces(await c.innerText())).toContain('$21 000–24 000');
  await expect(c).toContainText('Підбір під замовлення');
});

test('6.4 price split: above the price is refused, under it shows "інше"', async ({
  page,
  context,
}) => {
  const r = await createRequest();
  await seller(context);
  await openOfferForm(page, r.id);
  await fillShortOffer(page, 'Split Car', '2021', '25000');
  await page.getByRole('button', { name: /Розбити ціну на складові/ }).click();
  await fill(page, 'priceCarUsd', '30000');
  await submit(page);
  await expect(page.getByText('Складові разом більші за ціну')).toBeVisible();
  await fill(page, 'priceCarUsd', '20000');
  await fill(page, 'priceDeliveryUsd', '3000');
  await submit(page);
  await sentOk(page);
  await page.goto(`/ua/my/${r.key}`);
  const c = page.locator('article').filter({ hasText: 'Split Car' });
  expect(spaces(await c.innerText())).toContain('інше $2 000');
});

test('6.5 VIN: wrong format, then another make needs one confirmation', async ({
  page,
  context,
}) => {
  const r = await createRequest({ brand: 'Toyota' });
  await seller(context);
  await openOfferForm(page, r.id);
  await fillShortOffer(page, 'Toyota RAV4', '2019', '24000');
  await openMore(page);
  await fill(page, 'vin', 'ABC123');
  await submit(page);
  await expect(page.getByText('Перевірте VIN: 17 символів')).toBeVisible();
  await fill(page, 'vin', 'TMBJG7NE5K0123456');
  await submit(page);
  await expect(page.getByRole('alert').filter({ hasText: 'За VIN це' })).toContainText(
    'SKODA Octavia',
  );
  await submit(page);
  await sentOk(page);
  await page.goto(`/ua/my/${r.key}`);
  await expect(page.locator('article').filter({ hasText: 'TMBJG7NE5K0123456' })).toContainText(
    'SKODA',
  );
});

test('6.8 copy from a previous offer lists only the same car', async ({ page, context }) => {
  const s = await seller(context);
  const same = await createRequest({ brand: 'Toyota', model: 'RAV4' });
  const other = await createRequest({ brand: 'Toyota', model: 'Camry' });
  await createOffer(same.id, s.id, { car: 'RAV4 Copied', priceUsd: 23300 });
  await createOffer(other.id, s.id, { car: 'Camry Not Listed' });
  const r = await createRequest({ brand: 'Toyota', model: 'RAV4' });
  await openOfferForm(page, r.id);
  const select = page.locator('select').filter({ hasText: 'Оберіть пропозицію' });
  const options = await select.locator('option').allInnerTexts();
  expect(options.join('|')).toContain('RAV4 Copied');
  expect(options.join('|')).not.toContain('Camry Not Listed');
  await select.selectOption({ index: 1 });
  await expect(page.locator('input[name="car"]')).toHaveValue('RAV4 Copied');
});

test('6.9 a new seller is limited to 5 offers a day', async ({ page, context }) => {
  const s = await seller(context, { status: 'pending' });
  for (let i = 0; i < 5; i++) createOffer((await createRequest()).id, s.id);
  await expect
    .poll(
      async () =>
        (await sql`select count(*)::int as n from offers where seller_id = ${s.id}`)[0]!.n,
    )
    .toBe(5);
  const r = await createRequest();
  await openOfferForm(page, r.id);
  await fillShortOffer(page, 'One Too Many', '2021', '24000');
  await submit(page);
  await expect(page.getByText('Ви досягли денного ліміту')).toBeVisible();
});

test('6.10 an importer cannot answer an owners-only request', async ({ page, context }) => {
  const r = await createRequest({ sellerTypes: ['owner'] });
  await seller(context, { type: 'importer' });
  await page.goto(`/ua/requests/${r.id}/offer`);
  await expect(page.getByText('Тип вашого профілю не підходить')).toBeVisible();
  await expect(page.locator('input[name="car"]')).toHaveCount(0);
});

test('6.11 + 3.12 editing: a price drop tells the buyer, a small edit does not', async ({
  page,
  context,
}) => {
  const r = await createRequest();
  const s = await seller(context);
  await createOffer(r.id, s.id, { car: 'Edit Me', priceUsd: 25000, status: 'shown' });
  await sql`update offers set notified_price_usd = 25000 where seller_id = ${s.id}`;
  await openOfferForm(page, r.id);
  await expect(page.getByText('Покупець побачить позначку «Оновлено»')).toBeVisible();
  await fill(page, 'priceUsd', '23500');
  await page.getByRole('button', { name: 'Оновити пропозицію' }).click();
  await expect(page.getByText('Пропозицію оновлено')).toBeVisible();
  const msg = await waitForMessage(r.buyer, /оновлено/);
  expect(spaces(msg.text)).toContain('$25 000 → $23 500');

  await openOfferForm(page, r.id);
  await openMore(page);
  await page.locator('textarea[name="description"]').fill('Новий опис');
  await page.getByRole('button', { name: 'Оновити пропозицію' }).click();
  await expect(page.getByText('Пропозицію оновлено')).toBeVisible();
  await expectNoMessage(r.buyer, /Новий опис/);
  expect((await messagesTo(r.buyer)).filter((m) => /оновлено/.test(m.text))).toHaveLength(1);

  await page.goto(`/ua/my/${r.key}`);
  const c = page.locator('article').filter({ hasText: 'Edit Me' });
  await expect(c.getByText('Оновлено')).toBeVisible();
});

test('3.13 a digest buyer gets new offers held for the morning', async ({ page, context }) => {
  const r = await createRequest();
  await sql`update buyer_requests set notify_mode = 'digest' where id = ${r.id}`;
  await seller(context);
  await openOfferForm(page, r.id);
  await fillShortOffer(page, 'Held Offer', '2021', '24000');
  await submit(page);
  await sentOk(page);
  await expectNoMessage(r.buyer, /Held Offer/);
  const held = await sql`select send_after from pending_messages where chat_id = ${r.buyer}`;
  expect(held).toHaveLength(1);
  expect((held[0]!.send_after as Date).getTime()).toBeGreaterThan(Date.now());
});

test('6.12 withdraw as sold, the buyer sees it, then put it back', async ({ page, context }) => {
  const r = await createRequest({ model: 'Withdrawn RAV4' });
  const s = await seller(context);
  await createOffer(r.id, s.id, { car: 'Withdraw Me', status: 'shown' });
  await page.goto('/ua/account');
  const item = page.locator('li').filter({ hasText: 'Withdraw Me' });
  await item.getByText('Зняти пропозицію').click();
  await item.getByRole('button', { name: 'Авто продано' }).click();
  await expect(item.getByText('Знято: авто продано')).toBeVisible();

  const buyer = await context.browser()!.newPage();
  await buyer.goto(`/ua/my/${r.key}`);
  await expect(buyer.locator('article').filter({ hasText: 'Withdraw Me' })).toContainText(
    'авто вже продано',
  );
  await buyer.close();

  await item.getByRole('button', { name: 'Повернути' }).click();
  await expect(item.getByText('Переглянуто')).toBeVisible();
});

test('6.13 account lists closed requests, buyer asks and 30-day stats', async ({
  page,
  context,
}) => {
  const s = await seller(context);
  const closed = await createRequest({ model: 'Closed One' });
  await createOffer(closed.id, s.id, { car: 'On Closed', status: 'shown' });
  await sql`update buyer_requests set status = 'closed', close_reason = 'found_elsewhere'
            where id = ${closed.id}`;
  const asked = await createRequest({ model: 'Asked One' });
  const askedOffer = await createOffer(asked.id, s.id, { car: 'On Asked', status: 'shown' });
  await sql`update offers set asks = ${['vin', 'photos']} where id = ${askedOffer}`;
  await page.goto('/ua/account');
  await expect(page.locator('li').filter({ hasText: 'On Closed' })).toContainText(
    'Покупець знайшов авто деінде',
  );
  await expect(page.locator('li').filter({ hasText: 'On Asked' })).toContainText(
    'Покупець просить: VIN, Більше фото',
  );
  await expect(page.getByText(/За 30 днів: надіслано 2 · переглянуто 2/)).toBeVisible();
});

test('6.14 replying to a complaint tells the admins', async ({ page, context }) => {
  const r = await createRequest();
  const s = await seller(context, { name: 'Відповідач' });
  const offerId = await createOffer(r.id, s.id, { car: 'Complained', status: 'declined' });
  await sql`insert into reports (offer_id, reason, comment) values (${offerId}, 'price', 'Ціна інша')`;
  await page.goto('/ua/account');
  await page.locator('textarea[name="reply"]').first().fill('Ціна була вказана правильно');
  await page.getByRole('button', { name: 'Надіслати відповідь' }).click();
  await expect(page.getByText('Ваша відповідь надіслана')).toBeVisible();
  await waitForMessage(ADMIN_TELEGRAM_ID, /Відповідач відповів на скаргу/);
});

test('6.15 a review reply shows on the seller page with phones hidden, and can be edited', async ({
  page,
  context,
}) => {
  const r = await createRequest();
  const s = await seller(context, { name: 'Відгуковий' });
  await sql`insert into seller_reviews (seller_id, request_id, rating, comment)
            values (${s.id}, ${r.id}, 4, 'Добре')`;
  await page.goto('/ua/account');
  await page.getByText('Відповісти публічно').click();
  await page.locator('textarea[name="reply"]').fill('Дякуємо! Дзвоніть 0671234567');
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await expect(page.getByText('Змінити відповідь')).toBeVisible();
  await page.goto(`/ua/s/${s.id}`);
  await expect(page.getByText(/Дякуємо!/)).toBeVisible();
  await expect(page.getByText('0671234567')).toHaveCount(0);

  await page.goto('/ua/account');
  await page.getByText('Змінити відповідь').click();
  await page.locator('textarea[name="reply"]').fill('Дякуємо за відгук');
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await expect
    .poll(
      async () =>
        (await sql`select seller_reply from seller_reviews where request_id = ${r.id}`)[0]!
          .seller_reply,
    )
    .toBe('Дякуємо за відгук');
  await page.goto(`/ua/s/${s.id}`);
  await expect(page.getByText('Дякуємо за відгук')).toBeVisible();
});
