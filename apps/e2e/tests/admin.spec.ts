import { expect, test, type Page } from '@playwright/test';
import { ADMIN_TELEGRAM_ID } from '../src/env.ts';
import { WANTED_VIN } from '../src/setup.ts';
import {
  createOffer,
  createRequest,
  createSeller,
  fill,
  newTelegramId,
  signIn,
  sql,
  waitForMessage,
} from './helpers.ts';

// Plan section 7: the admin page.

const sellerCard = (page: Page, name: string) =>
  page.locator('article').filter({ has: page.getByText(name, { exact: true }) });

test('7.1 the admin page is a 404 for visitors and non-admins', async ({ page, context }) => {
  const res = await page.goto('/ua/admin');
  expect(res!.status()).toBe(404);
  await signIn(context, newTelegramId());
  expect((await page.goto('/ua/admin'))!.status()).toBe(404);
});

test('7.2 + 4.6 verify, move back, ban: badge, message and hidden offers', async ({
  page,
  context,
  browser,
}) => {
  const name = `Модерований ${newTelegramId()}`;
  const sellerTg = newTelegramId();
  const sellerId = await createSeller(sellerTg, { name, status: 'pending' });
  const r = await createRequest();
  await createOffer(r.id, sellerId, { car: 'Moderated Car' });
  await signIn(context, ADMIN_TELEGRAM_ID, 'Admin');
  page.on('dialog', (d) => void d.accept());
  await page.goto('/ua/admin');
  const card = sellerCard(page, name);

  await card.getByRole('button', { name: 'Підтвердити' }).click();
  await expect(card.getByText('Перевірений', { exact: true })).toBeVisible();
  await waitForMessage(sellerTg, /.+/);
  const buyer = await browser.newPage();
  await buyer.goto(`/ua/my/${r.key}`);
  await expect(buyer.locator('article').filter({ hasText: 'Moderated Car' })).toContainText(
    'Перевірений продавець',
  );

  await card.getByRole('button', { name: 'На перевірку' }).click();
  await expect(card.getByText('На перевірці', { exact: true })).toBeVisible();

  await card.getByRole('button', { name: 'Заблокувати' }).click();
  await expect(card.getByText('Заблокований', { exact: true })).toBeVisible();
  await buyer.reload();
  await expect(buyer.locator('article').filter({ hasText: 'Moderated Car' })).toHaveCount(0);
  await buyer.close();

  // A banned seller can't send new offers.
  const sellerContext = await browser.newContext();
  await signIn(sellerContext, sellerTg);
  const sellerPage = await sellerContext.newPage();
  const other = await createRequest();
  await sellerPage.goto(`/ua/requests/${other.id}/offer`);
  await fill(sellerPage, 'car', 'Banned Offer');
  await fill(sellerPage, 'year', '2021');
  await fill(sellerPage, 'priceUsd', '24000');
  await sellerPage.getByRole('button', { name: 'Надіслати пропозицію' }).click();
  await expect(sellerPage.getByText('Ваш акаунт заблоковано')).toBeVisible();
  await sellerContext.close();
});

test('7.3 resolving a complaint takes it off the list', async ({ page, context }) => {
  const r = await createRequest();
  const offerId = await createOffer(r.id, await createSeller(newTelegramId()), {
    car: 'Reported Car',
  });
  const comment = `Скарга ${newTelegramId()}`;
  await sql`insert into reports (offer_id, reason, comment) values (${offerId}, 'spam', ${comment})`;
  await signIn(context, ADMIN_TELEGRAM_ID, 'Admin');
  await page.goto('/ua/admin');
  const item = page.locator('article').filter({ hasText: comment });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Закрити скаргу' }).click();
  await expect(item).toHaveCount(0);
});

test('7.4 VIN flags and page view counts', async ({ page, context }) => {
  const r = await createRequest();
  const name = `VIN Продавець ${newTelegramId()}`;
  await createOffer(r.id, await createSeller(newTelegramId(), { name }), { vin: WANTED_VIN });
  await page.goto('/ua/faq?utm_source=e2estats');
  await page.waitForTimeout(500);
  await signIn(context, ADMIN_TELEGRAM_ID, 'Admin');
  await page.goto('/ua/admin');
  const flag = page.locator('article').filter({ hasText: name }).filter({ hasText: WANTED_VIN });
  await expect(flag).toContainText('У розшуку МВС');
  await expect(page.getByText('e2estats')).toBeVisible();
});
