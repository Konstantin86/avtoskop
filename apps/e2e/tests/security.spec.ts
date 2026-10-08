import { expect, test, type Page } from '@playwright/test';
import {
  choose,
  createOffer,
  createRequest,
  createSeller,
  fill,
  newTelegramId,
  signIn,
  sql,
  type SellerOptions,
} from './helpers.ts';

// Plan section 8: private links, other people's data, contacts and uploads.

const statusOf = async (offerId: string) =>
  (await sql`select status from offers where id = ${offerId}`)[0]!.status as string;

// Points every hidden field with this name at someone else's record, as a tampered form would.
async function retarget(page: Page, field: string, value: string) {
  await page.evaluate(
    ([name, v]) => {
      document
        .querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)
        .forEach((i) => (i.value = v!));
    },
    [field, value],
  );
}

async function png(page: Page) {
  await page.setContent('<div style="width:40px;height:30px;background:#36c"></div>');
  return page.locator('div').screenshot();
}

const upload = async (page: Page, buffer: Buffer) =>
  page.request.post('/api/photos', {
    multipart: { photo: { name: 'p.png', mimeType: 'image/png', buffer } },
  });

test('8.1 a wrong private key shows "not found" and nothing else', async ({ page }) => {
  const r = await createRequest({ model: 'Secret RAV4' });
  await page.goto(`/ua/my/${'x'.repeat(30)}`);
  await expect(page.getByText('Secret RAV4')).toHaveCount(0);
  expect(await page.content()).not.toContain(r.id);
});

test("8.2 a buyer can't act on another request's offer", async ({ page }) => {
  const mine = await createRequest();
  const theirs = await createRequest();
  await createOffer(mine.id, await createSeller(newTelegramId()), { car: 'Mine' });
  const foreign = await createOffer(theirs.id, await createSeller(newTelegramId()));
  await page.goto(`/ua/my/${mine.key}`);
  await retarget(page, 'offerId', foreign);
  await page.getByRole('button', { name: 'Не цікаво' }).click();
  await page.waitForTimeout(1000);
  expect(await statusOf(foreign)).toBe('sent');
});

test("8.3 a seller can't withdraw another seller's offer or answer their reviews", async ({
  page,
  context,
}) => {
  const meTg = newTelegramId();
  const me = await createSeller(meTg);
  await signIn(context, meTg);
  const r = await createRequest();
  await createOffer(r.id, me, { car: 'My Offer', status: 'shown' });
  const other = await createSeller(newTelegramId());
  const foreignOffer = await createOffer((await createRequest()).id, other, { status: 'shown' });
  const otherRequest = await createRequest();
  const [review] = await sql`insert into seller_reviews (seller_id, request_id, rating, comment)
                             values (${other}, ${otherRequest.id}, 2, 'Погано') returning id`;
  const myRequest = await createRequest();
  await sql`insert into seller_reviews (seller_id, request_id, rating, comment)
            values (${me}, ${myRequest.id}, 5, 'Добре')`;

  await page.goto('/ua/account');
  await retarget(page, 'offerId', foreignOffer);
  await page.getByText('Зняти пропозицію').click();
  await page.getByRole('button', { name: 'Авто продано' }).click();
  await page.waitForTimeout(1000);
  expect(await statusOf(foreignOffer)).toBe('shown');

  await page.goto('/ua/account');
  await retarget(page, 'reviewId', review!.id as string);
  await page.getByText('Відповісти публічно').click();
  await page.locator('textarea[name="reply"]').fill('Чужа відповідь');
  await page.getByRole('button', { name: 'Зберегти відповідь' }).click();
  await page.waitForTimeout(1000);
  const [row] = await sql`select seller_reply from seller_reviews where id = ${review!.id}`;
  expect(row!.seller_reply ?? '').toBe('');
});

test('8.4 the buyer phone appears on no public or seller page', async ({ page, context }) => {
  const r = await createRequest();
  const digits = r.phone.slice(-9);
  const sellerTg = newTelegramId();
  const sellerId = await createSeller(sellerTg);
  await createOffer(r.id, sellerId, { status: 'shown' });
  const pages = ['/ua/requests', `/ua/requests/${r.id}`, `/ua/s/${sellerId}`, `/ua/my/${r.key}`];
  for (const path of pages) {
    await page.goto(path);
    expect(await page.content(), path).not.toContain(digits);
  }
  await signIn(context, sellerTg);
  for (const path of [`/ua/requests/${r.id}/offer`, '/ua/account']) {
    await page.goto(path);
    expect(await page.content(), path).not.toContain(digits);
  }
});

test('8.5 contacts are masked in notes, offer descriptions and reviews', async ({
  page,
  context,
  browser,
}) => {
  const r = await createRequest();
  await sql`update buyer_requests set notes = 'Пишіть +380 67 123 45 67 або @buyer_tg' where id = ${r.id}`;
  await page.goto(`/ua/requests/${r.id}`);
  const html = await page.content();
  expect(html).not.toContain('123 45 67');
  expect(html).not.toContain('@buyer_tg');

  const sellerTg = newTelegramId();
  const sellerId = await createSeller(sellerTg, { name: 'Маскований' } satisfies SellerOptions);
  await signIn(context, sellerTg);
  await page.goto(`/ua/requests/${r.id}/offer`);
  await fill(page, 'car', 'Masked Car');
  await fill(page, 'year', '2021');
  await fill(page, 'priceUsd', '24000');
  await page.locator('summary').filter({ hasText: 'Більше деталей' }).click();
  await page
    .locator('textarea[name="description"]')
    .fill('Гарний стан.\nДзвоніть 0671112233, сайт www.example.com');
  await page.getByRole('button', { name: 'Надіслати пропозицію' }).click();
  await expect(page.getByText('Пропозицію надіслано')).toBeVisible();

  const buyer = await browser.newPage();
  await buyer.goto(`/ua/my/${r.key}`);
  const card = buyer.locator('article').filter({ hasText: 'Masked Car' });
  await expect(card).toContainText('Гарний стан.');
  await expect(card).not.toContainText('0671112233');
  await expect(card).not.toContainText('example.com');

  const offerId = (await sql`select id from offers where seller_id = ${sellerId}`)[0]!.id;
  await sql`update offers set status = 'contact_shared' where id = ${offerId}`;
  await buyer.reload();
  await choose(buyer, 'reason', 'found_here');
  await buyer.getByRole('button', { name: 'Закрити запит' }).click();
  await choose(buyer, 'rating', '4');
  await buyer
    .locator('form')
    .filter({ hasText: 'Оцініть продавця' })
    .locator('textarea')
    .fill('Нормально, ось мій номер 0509998877');
  await buyer.getByRole('button', { name: 'Надіслати відгук' }).click();
  await expect(buyer.getByRole('heading', { name: 'Оцініть продавця' })).toHaveCount(0);
  await buyer.goto(`/ua/s/${sellerId}`);
  await expect(buyer.getByText(/Нормально, ось мій номер/)).toBeVisible();
  expect(await buyer.content()).not.toContain('0509998877');
  await buyer.close();
});

test('8.6 private pages are noindex; photos have long random names', async ({ page, context }) => {
  const r = await createRequest();
  const sellerTg = newTelegramId();
  const sellerId = await createSeller(sellerTg);
  await signIn(context, sellerTg);
  for (const path of [`/ua/my/${r.key}`, '/ua/account', `/ua/s/${sellerId}`]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', /noindex/);
  }
  const res = await upload(page, await png(page));
  expect(res.status()).toBe(200);
  const { thumb } = (await res.json()) as { thumb: string };
  expect(thumb).toMatch(/^\/photos\/[0-9a-f]{32}/);
});

test('8.7 uploads need a seller who is not banned, and at most 30 waiting photos', async ({
  page,
  context,
}) => {
  const image = await png(page);
  expect((await upload(page, image)).status()).toBe(401);

  const tg = newTelegramId();
  const sellerId = await createSeller(tg);
  await signIn(context, tg);
  for (let i = 0; i < 30; i++) {
    await sql`insert into offer_photos (seller_id, key, width, height)
              values (${sellerId}, ${`e2e${tg}${i}`}, 10, 10)`;
  }
  const full = await upload(page, image);
  expect(full.status()).toBe(400);
  expect(await full.json()).toEqual({ error: 'tooMany' });

  await sql`update sellers set status = 'banned' where id = ${sellerId}`;
  expect((await upload(page, image)).status()).toBe(401);
});
