import { expect, test } from '@playwright/test';
import {
  botShareContact,
  botStart,
  brandId,
  createSeller,
  expectNoMessage,
  fill,
  newTelegramId,
  pickBrand,
  sql,
  waitForMessage,
} from './helpers.ts';

// Plan section 1: a buyer posts a request and confirms it in the bot.

async function fillRequest(page: import('@playwright/test').Page, model = 'RAV4') {
  await page.goto('/ua/request');
  await pickBrand(page, 'Toyota');
  await fill(page, 'model', model);
  await page.locator('[name="model"]').blur();
  await fill(page, 'yearFrom', '2020');
  await fill(page, 'budgetUsd', '26000');
  await page.locator('select[name="region"]').selectOption('kyiv');
  await page.locator('input[name="consent"]').check();
}

async function submitAndGetId(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Опублікувати запит' }).click();
  await page.waitForURL(/\/request\/sent\?/);
  const url = new URL(page.url());
  return { id: url.searchParams.get('id')!, key: url.searchParams.get('key')! };
}

test('1.1 home quick form carries its values into the request form', async ({ page }) => {
  await page.goto('/ua');
  const brand = page.locator('#q-brand');
  await brand.click();
  await brand.fill('Toyota');
  await page.getByRole('option', { name: 'Toyota', exact: true }).first().click();
  await page.locator('form').filter({ has: brand }).locator('[name="model"]').fill('RAV4');
  await page.getByRole('button', { name: 'Отримати пропозиції' }).click();
  await page.waitForURL(/\/ua\/request\?/);
  await expect(page.locator('#brandId')).toHaveValue('Toyota');
  await expect(page.locator('[name="model"]')).toHaveValue('RAV4');
});

test('1.2 an empty form shows errors', async ({ page }) => {
  await page.goto('/ua/request');
  await page.getByRole('button', { name: 'Опублікувати запит' }).click();
  await expect(page.locator('.error-text').first()).toBeVisible();
  expect(await page.locator('.error-text').count()).toBeGreaterThanOrEqual(3);
});

test('1.3 brand picker: popular first, keyboard choice, reopens on a second click', async ({
  page,
}) => {
  await page.goto('/ua/request');
  const field = page.locator('#brandId');
  await field.click();
  const options = page.getByRole('option');
  await expect(page.getByRole('listbox')).toContainText('Популярні');
  await field.fill('to');
  await expect(options.first()).toHaveText(/Toyota/);
  await field.press('ArrowDown');
  await field.press('Enter');
  await expect(field).toHaveValue('Toyota');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await field.click();
  await expect(page.getByRole('listbox')).toBeVisible();
});

test('1.4 the model field follows the brand and refuses unknown models', async ({ page }) => {
  await page.goto('/ua/request');
  await expect(page.locator('[name="model"]')).toHaveAttribute('placeholder', 'Наприклад, RAV4');
  await pickBrand(page, 'Mazda');
  await expect(page.locator('[name="model"]')).toHaveAttribute('placeholder', 'Оберіть модель');
  await fillRequest(page, 'Nonexistent9');
  await page.getByRole('button', { name: 'Опублікувати запит' }).click();
  await expect(page.getByText('Оберіть модель зі списку', { exact: false }).first()).toBeVisible();
});

test('1.5 number fields keep digits only', async ({ page }) => {
  await page.goto('/ua/request');
  await page.locator('[name="budgetUsd"]').pressSequentially('2a5 0x00$');
  await expect(page.locator('[name="budgetUsd"]')).toHaveValue('25000');
});

test('1.6 "new car" presets seller types, year and hides mileage', async ({ page }) => {
  await page.goto('/ua/request');
  await page.locator('input[name="condition"][value="new"]').check();
  const types = page.locator('input[name="sellerTypes"]');
  await expect(types.nth(0)).toBeChecked();
  await expect(types.nth(1)).toBeChecked();
  await expect(types.nth(2)).not.toBeChecked();
  await expect(types.nth(3)).not.toBeChecked();
  await expect(page.locator('[name="yearFrom"]')).toHaveValue(String(new Date().getFullYear()));
  await page.getByText('Більше параметрів').click();
  await expect(page.locator('[name="mileageMaxKm"]')).toHaveCount(0);
});

test('1.7 the seller count shows from three matching sellers', async ({ page }) => {
  const toyota = await brandId('Toyota');
  for (let i = 0; i < 3; i++)
    await createSeller(newTelegramId(), { brandIds: [toyota], serviceRegions: ['kyiv'] });
  await fillRequest(page);
  await expect(
    page.getByRole('status').filter({ hasText: 'отримають ваш запит на Toyota' }),
  ).toBeVisible();
});

test('1.8–1.9 publish, confirm in the bot, sellers get the alert', async ({ page }) => {
  const toyota = await brandId('Toyota');
  const sellerTg = newTelegramId();
  await createSeller(sellerTg, { brandIds: [toyota] });
  await fillRequest(page);
  const { id } = await submitAndGetId(page);
  await expect(page.getByText('Поділіться номером у Telegram').first()).toBeVisible();

  const buyer = newTelegramId();
  await botStart(buyer, `req_${id}`);
  await waitForMessage(buyer, /поділіться номером/i);
  await botShareContact(buyer, '380501112233');
  await waitForMessage(buyer, /опубліковано/);
  await waitForMessage(buyer, /особисте посилання|посилання на пропозиції/i);
  await waitForMessage(buyer, /AUTO\.RIA/);
  await waitForMessage(sellerTg, /Новий запит/);

  const [row] = await sql`select status, phone_verified from buyer_requests where id = ${id}`;
  expect(row).toMatchObject({ status: 'active', phone_verified: true });
  // The "sent" page notices the confirmation by itself.
  await expect(page.getByText('Запит опубліковано').first()).toBeVisible({ timeout: 15_000 });
});

test("1.10 sharing someone else's contact is refused", async ({ page }) => {
  await fillRequest(page);
  const { id } = await submitAndGetId(page);
  const buyer = newTelegramId();
  await botStart(buyer, `req_${id}`);
  await waitForMessage(buyer, /поділіться номером/i);
  await fetch('http://localhost:3900/__updates', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message_id: 1,
      chat: { id: buyer, type: 'private' },
      from: { id: buyer, first_name: 'Test' },
      contact: { phone_number: '380509999999', user_id: buyer + 1 },
    }),
  });
  await waitForMessage(buyer, /власним номером/);
});

test('1.11–1.12 known buyers publish at once, up to three a day', async ({ page }) => {
  const buyer = newTelegramId();
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) {
    await fillRequest(page);
    ids.push((await submitAndGetId(page)).id);
  }
  await botStart(buyer, `req_${ids[0]}`);
  await botShareContact(buyer, '380507776655');
  await waitForMessage(buyer, /опубліковано/);
  // Second and third: no number asked.
  for (const id of ids.slice(1, 3)) {
    const before = (
      await sql`select count(*)::int as n from buyer_requests where phone_verified and telegram_chat_id = ${buyer}`
    )[0]!.n;
    await botStart(buyer, `req_${id}`);
    await expect
      .poll(
        async () =>
          (
            await sql`select count(*)::int as n from buyer_requests where phone_verified and telegram_chat_id = ${buyer}`
          )[0]!.n,
      )
      .toBe(before + 1);
  }
  await botStart(buyer, `req_${ids[3]}`);
  await waitForMessage(buyer, /3 запити/);
  const [last] = await sql`select phone_verified from buyer_requests where id = ${ids[3]!}`;
  expect(last!.phone_verified).toBe(false);
  await expectNoMessage(buyer, /помилка/i, 500);
});
