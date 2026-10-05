import { and, eq, gt, inArray, ne } from 'drizzle-orm';
import { localePath, requestMatchesSeller } from '@avtoskop/core';
import { brands, buyerRequests, sellers, users, type Db } from '@avtoskop/db';
import en from '@avtoskop/i18n/messages/en.json' with { type: 'json' };
import uk from '@avtoskop/i18n/messages/uk.json' with { type: 'json' };
import type { Telegram } from './telegram.ts';
import { botText, requestLabel } from './texts.ts';

const SELLER_LOCALE = 'uk';
// Telegram allows about 30 messages a second; stay well below it.
const SEND_GAP_MS = 60;

export interface RequestDetails {
  budgetUsd: number;
  region: string;
  fuel: string;
  gearbox: string;
  importOk: boolean;
}

export function requestDetails(locale: string, r: RequestDetails): string {
  const m = locale === 'en' ? en : uk;
  const fields = m.fields as Record<string, string>;
  const regions = m.regions as Record<string, string>;
  const budget = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'uk-UA').format(r.budgetUsd);
  return [
    botText(locale, 'alertBudget', { amount: budget }),
    regions[r.region],
    r.fuel !== 'any' ? fields[`fuel_${r.fuel}`] : null,
    r.gearbox !== 'any' ? fields[`gearbox_${r.gearbox}`] : null,
    botText(locale, r.importOk ? 'alertImportOk' : 'alertImportNo'),
  ]
    .filter(Boolean)
    .join(' · ');
}

// Sends each newly published request to the sellers whose alert settings match it.
export function createSellerAlerts(
  db: Db,
  tg: Telegram,
  siteUrl: string,
  log: (m: string) => void,
) {
  return async function alertSellers(requestIds: string[]): Promise<void> {
    if (requestIds.length === 0) return;
    const requests = await db
      .select({
        id: buyerRequests.id,
        brandId: buyerRequests.brandId,
        brand: brands.name,
        model: buyerRequests.model,
        yearFrom: buyerRequests.yearFrom,
        yearTo: buyerRequests.yearTo,
        budgetUsd: buyerRequests.budgetUsd,
        region: buyerRequests.region,
        fuel: buyerRequests.fuel,
        gearbox: buyerRequests.gearbox,
        importOk: buyerRequests.importOk,
        buyerChatId: buyerRequests.telegramChatId,
      })
      .from(buyerRequests)
      .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
      .where(and(inArray(buyerRequests.id, requestIds), eq(buyerRequests.status, 'active')));
    if (requests.length === 0) return;

    const candidates = await db
      .select({
        telegramId: users.telegramId,
        type: sellers.type,
        status: sellers.status,
        alerts: sellers.alerts,
        brandIds: sellers.brandIds,
        serviceRegions: sellers.serviceRegions,
      })
      .from(sellers)
      .innerJoin(users, eq(sellers.userId, users.id))
      .where(and(eq(sellers.alerts, true), ne(sellers.status, 'banned'), gt(users.telegramId, 0)));

    for (const r of requests) {
      const text = botText(SELLER_LOCALE, 'newRequest', {
        request: requestLabel(r),
        details: requestDetails(SELLER_LOCALE, r),
        link: siteUrl + localePath(SELLER_LOCALE, `/requests/${r.id}/offer`),
        settings: siteUrl + localePath(SELLER_LOCALE, '/sellers/profile'),
      });
      let sent = 0;
      for (const s of candidates) {
        // Never alert buyers about their own request.
        if (s.telegramId === r.buyerChatId || !requestMatchesSeller(r, s)) continue;
        try {
          await tg.sendMessage(s.telegramId, text);
          sent += 1;
        } catch (error) {
          // Usually the seller blocked the bot; the rest still get the alert.
          log(`Alert to ${s.telegramId} failed: ${(error as Error).message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
      }
      log(`Request ${r.id}: alerted ${sent} seller(s)`);
    }
  };
}
