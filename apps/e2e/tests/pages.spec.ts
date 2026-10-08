import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import uk from '@avtoskop/i18n/messages/uk.json' with { type: 'json' };
import { ADMIN_TELEGRAM_ID, BASE_URL } from '../src/env.ts';
import { WANTED_VIN } from '../src/setup.ts';
import { createOffer, createRequest, createSeller, signIn, sql } from './helpers.ts';

// Plan section 9: every page in both languages, both themes and two screen sizes.

const SHOTS = join(import.meta.dirname, '..', 'screenshots');
const RAW_KEY = new RegExp(`\\b(${Object.keys(uk).join('|')})\\.[a-zA-Z_]+\\b`);
const LOCALES = [
  { code: 'uk', prefix: '/ua' },
  { code: 'en', prefix: '/en' },
] as const;

let paths: Array<[string, string]> = [];
// Allowed in English text: brand names written in Cyrillic, the language switch, and the
// Ukrainian name of the police service centre, kept so buyers know what to look for.
let allowedCyrillic: string[] = ['Українська', 'УКР', 'ТСЦ МВС'];

test.beforeAll(async () => {
  // The admin is also a seller here, so one signed-in browser sees every page.
  const sellerId = await createSeller(ADMIN_TELEGRAM_ID, { name: 'Pages Motors' });
  const r = await createRequest({ brand: 'Toyota', model: 'RAV4' });
  await createOffer(r.id, sellerId, { car: 'Toyota RAV4 Hybrid', vin: WANTED_VIN });
  await createOffer(r.id, await createSeller(9_100_000 + Math.floor(Math.random() * 1e5)), {
    car: 'Toyota RAV4 XLE',
    mileageKm: null,
  });
  const cyrillicBrands = await sql`select name from brands where name ~ '[А-Яа-яІіЇїЄєҐґ]'`;
  allowedCyrillic = [...allowedCyrillic, ...cyrillicBrands.map((b) => b.name as string)];
  paths = [
    ['home', ''],
    ['request', '/request'],
    ['requests', '/requests'],
    ['request-page', `/requests/${r.id}`],
    ['offer-form', `/requests/${r.id}/offer`],
    ['sellers', '/sellers'],
    ['profile', '/sellers/profile'],
    ['about', '/about'],
    ['faq', '/faq'],
    ['safety', '/safety'],
    ['terms', '/terms'],
    ['privacy', '/privacy'],
    ['account', '/account'],
    ['my', `/my/${r.key}`],
    ['my-edit', `/my/${r.key}/edit`],
    ['seller-page', `/s/${sellerId}`],
    ['admin', '/admin'],
  ];
});

async function signedIn(browser: Browser, options: Parameters<Browser['newContext']>[0] = {}) {
  const context = await browser.newContext({ baseURL: BASE_URL, locale: 'uk-UA', ...options });
  await signIn(context, ADMIN_TELEGRAM_ID, 'Admin');
  return context;
}

async function visibleText(page: Page) {
  // Details folded by default still count: their text is part of the page.
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  return page.locator('body').innerText();
}

for (const { code, prefix } of LOCALES) {
  test(`9.1 every page in ${code}: no raw keys, no long dash${code === 'en' ? ', no Ukrainian' : ''}`, async ({
    browser,
  }) => {
    const context = await signedIn(browser);
    const page = await context.newPage();
    const problems: string[] = [];
    for (const [name, path] of paths) {
      const res = await page.goto(prefix + path);
      if (!res || res.status() >= 400) problems.push(`${name}: HTTP ${res?.status()}`);
      const text = await visibleText(page);
      const key = text.match(RAW_KEY);
      if (key) problems.push(`${name}: raw key ${key[0]}`);
      if (text.includes('—')) problems.push(`${name}: long dash near "${around(text, '—')}"`);
      // The admin page lists what people wrote, in whatever language they wrote it.
      if (code === 'en' && name !== 'admin') {
        const english = allowedCyrillic.reduce((t, word) => t.split(word).join(''), text);
        const cyrillic = english.match(/[А-Яа-яІіЇїЄєҐґ][^\n]{0,40}/);
        if (cyrillic) problems.push(`${name}: Ukrainian text "${cyrillic[0]}"`);
      }
    }
    await context.close();
    expect(problems).toEqual([]);
  });
}

function around(text: string, needle: string) {
  const i = text.indexOf(needle);
  return text.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, ' ');
}

test('9.3 phone layout: nothing wider than the screen; the sticky button steps aside', async ({
  browser,
}) => {
  const context = await signedIn(browser, { viewport: { width: 375, height: 740 } });
  const page = await context.newPage();
  const wide: string[] = [];
  for (const [name, path] of paths) {
    await page.goto(`/ua${path}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 0) wide.push(`${name}: ${overflow}px`);
  }
  expect(wide).toEqual([]);

  const [, requestPath] = paths.find(([name]) => name === 'request-page')!;
  await page.goto(`/ua${requestPath}`);
  const bar = page.locator('div[aria-hidden]:has(> a[href$="/offer"])');
  // Past the page's own button but above the footer, the bar shows; at the footer it hides.
  const roomForBar = await page.evaluate(() => {
    const cta = document.getElementById('offer-cta')!.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + cta.bottom + 5);
    return document.querySelector('footer')!.getBoundingClientRect().top > window.innerHeight;
  });
  if (roomForBar) await expect(bar).toHaveAttribute('aria-hidden', 'false');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
  await context.close();
});

test('9.6 an unknown address shows a friendly 404 page in both languages', async ({ page }) => {
  const res = await page.goto('/ua/no-such-page');
  expect(res!.status()).toBe(404);
  await expect(page.locator('header')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeVisible();
  await page.getByRole('link', { name: 'На головну' }).click();
  await expect(page).toHaveURL(/\/ua$/);
  await page.goto('/en/no/such/page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('9.2 screenshots of every page: both languages, both themes, desktop and phone', async ({
  browser,
}) => {
  test.setTimeout(600_000);
  await mkdir(SHOTS, { recursive: true });
  for (const size of [
    { name: 'desktop', viewport: { width: 1280, height: 900 } },
    { name: 'phone', viewport: { width: 390, height: 844 } },
  ]) {
    for (const theme of ['light', 'dark'] as const) {
      const context = await signedIn(browser, { viewport: size.viewport, colorScheme: theme });
      await context.addCookies([{ name: 'avt_theme', value: theme, url: BASE_URL }]);
      const page = await context.newPage();
      for (const { code, prefix } of LOCALES) {
        for (const [name, path] of paths) {
          await page.goto(prefix + path);
          // Wait out the loading placeholders some pages show while their data streams in.
          await expect(page.locator('[class*="Skeleton"]')).toHaveCount(0);
          await page.screenshot({
            path: join(SHOTS, `${size.name}-${theme}-${code}-${name}.png`),
            fullPage: true,
            animations: 'disabled',
          });
        }
      }
      await context.close();
    }
  }
});
