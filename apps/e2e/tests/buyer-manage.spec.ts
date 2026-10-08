import { expect, test } from '@playwright/test';
import {
  choose,
  createOffer,
  createRequest,
  createSeller,
  brandId,
  expectNoMessage,
  fill,
  newTelegramId,
  sql,
  waitForMessage,
} from './helpers.ts';

// Plan section 2: the buyer manages a published request through the private link.

test('2.1–2.2 private page shows the status and a matching AUTO.RIA search', async ({ page }) => {
  const r = await createRequest({
    brand: 'Toyota',
    model: 'RAV4',
    yearFrom: 2020,
    budgetUsd: 26000,
  });
  await page.goto(`/ua/my/${r.key}`);
  await expect(page.getByText('Опубліковано ✓')).toBeVisible();
  const link = page.getByRole('link', { name: /Схожі авто на AUTO\.RIA/ });
  const href = decodeURIComponent((await link.getAttribute('href')) ?? '');
  expect(href).toContain('brand.id[0]=79');
  expect(href).toContain('year[0].gte=2020');
  expect(href).toContain('price.USD.lte=26000');
  expect(href).toContain('region.id[0]=10');
});

test('2.3 editing tells sellers with offers and updates the AUTO.RIA link', async ({ page }) => {
  const r = await createRequest({ budgetUsd: 25000, region: 'kyiv' });
  const sellerTg = newTelegramId();
  await createOffer(r.id, await createSeller(sellerTg), { status: 'shown' });
  await page.goto(`/ua/my/${r.key}/edit`);
  await expect(page.getByText('Марку й модель змінити не можна')).toBeVisible();
  await fill(page, 'budgetUsd', '27000');
  await page.locator('select[name="region"]').selectOption('all');
  await page.getByRole('button', { name: 'Зберегти зміни' }).click();
  await expect(page.getByText('Запит оновлено')).toBeVisible();
  const href = decodeURIComponent(
    (await page.getByRole('link', { name: /Схожі авто на AUTO\.RIA/ }).getAttribute('href')) ?? '',
  );
  expect(href).toContain('price.USD.lte=27000');
  expect(href).not.toContain('region.id');
  const msg = await waitForMessage(sellerTg, /Покупець змінив запит/);
  // Numbers are grouped with a no-break space.
  expect(msg.text.replace(/\s/g, ' ')).toContain('Бюджет: до $25 000 → до $27 000');
});

test('2.4 a fourth edit in a day is refused', async ({ page }) => {
  const r = await createRequest({ budgetUsd: 20000 });
  for (let i = 1; i <= 4; i++) {
    await page.goto(`/ua/my/${r.key}/edit`);
    await fill(page, 'budgetUsd', String(20000 + i * 100));
    await page.getByRole('button', { name: 'Зберегти зміни' }).click();
    if (i < 4) await expect(page.getByText('Запит оновлено')).toBeVisible();
  }
  await expect(page.getByText('Сьогодні запит уже змінювали 3 рази')).toBeVisible();
});

test('2.5 sellers who match only after an edit get the alert', async ({ page }) => {
  test.setTimeout(150_000);
  const r = await createRequest({ brand: 'Toyota', region: 'kyiv', budgetUsd: 25000 });
  const lviv = newTelegramId();
  await createSeller(lviv, { brandIds: [await brandId('Toyota')], serviceRegions: ['lviv'] });
  await page.goto(`/ua/my/${r.key}/edit`);
  await page.locator('select[name="region"]').selectOption('all');
  await page.getByRole('button', { name: 'Зберегти зміни' }).click();
  await expect(page.getByText('Запит оновлено')).toBeVisible();
  // The bot checks for these once a minute.
  await waitForMessage(lviv, /Новий запит/, 90_000);
});

test('2.6 extending near expiry adds 30 days', async ({ page }) => {
  const r = await createRequest();
  await sql`update buyer_requests set expires_at = now() + interval '3 days' where id = ${r.id}`;
  await page.goto(`/ua/my/${r.key}`);
  await page.getByRole('button', { name: 'Продовжити на 30 днів' }).click();
  await expect
    .poll(async () => {
      const [row] = await sql`select expires_at from buyer_requests where id = ${r.id}`;
      return (row!.expires_at as Date).getTime() - Date.now();
    })
    .toBeGreaterThan(29 * 86_400_000);
});

test('2.7–2.8 closing with a reason tells sellers; reopening clears it', async ({ page }) => {
  const r = await createRequest();
  const sellerTg = newTelegramId();
  const declinedTg = newTelegramId();
  await createOffer(r.id, await createSeller(sellerTg), { status: 'shown' });
  await createOffer(r.id, await createSeller(declinedTg), { status: 'declined' });
  await page.goto(`/ua/my/${r.key}`);
  await choose(page, 'reason', 'found_elsewhere');
  await page.getByRole('button', { name: 'Закрити запит' }).click();
  await expect(page.getByRole('heading', { name: 'Запит закрито' })).toBeVisible();
  const msg = await waitForMessage(sellerTg, /Покупець закрив запит/);
  expect(msg.text).toContain('знайшов авто деінде');
  await expectNoMessage(declinedTg, /закрив запит/);

  await page.getByRole('button', { name: 'Відкрити знову' }).click();
  await expect(page.getByRole('button', { name: 'Закрити запит' })).toBeVisible();
  const [row] = await sql`select status, close_reason from buyer_requests where id = ${r.id}`;
  expect(row).toMatchObject({ status: 'active', close_reason: null });
});

test('2.10 notification settings are saved', async ({ page }) => {
  const r = await createRequest();
  await page.goto(`/ua/my/${r.key}`);
  await page.getByText('Сповіщення в Telegram').click();
  await choose(page, 'mode', 'digest');
  await page.locator('input[name="quiet"]').uncheck();
  await page.getByRole('button', { name: 'Зберегти', exact: true }).click();
  await expect
    .poll(async () => {
      const [row] =
        await sql`select notify_mode, quiet_hours from buyer_requests where id = ${r.id}`;
      return row;
    })
    .toMatchObject({ notify_mode: 'digest', quiet_hours: false });
});
