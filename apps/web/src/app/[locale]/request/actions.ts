'use server';

import { eq, sql } from 'drizzle-orm';
import { getLocale } from 'next-intl/server';
import {
  alertTargetsChanged,
  buyerRequestInput,
  canonicalModel,
  editsInLastDay,
  hashSecret,
  newSecret,
  REQUEST_EDITS_PER_DAY,
  requestChanges,
} from '@avtoskop/core';
import { brands, buyerRequests } from '@avtoskop/db';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { encryptContact } from '@/server/contact';
import { getRequestByKey } from '@/server/buyer';
import { db } from '@/server/db';
import { modelNames } from '@/server/models';
import { notifySellersOfRequestChange } from '@/server/notify';

export interface RequestFormState {
  errors: string[];
  formError?: 'generic' | 'server' | 'editLimit' | 'closed';
  values: Record<string, string>;
}

function formValues(formData: FormData): Record<string, string> {
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'),
  ) as Record<string, string>;
  // Checkboxes repeat the same name; keep all of them, as one comma-separated value.
  for (const key of ['wishes', 'fuels', 'sellerTypes']) {
    values[key] = formData
      .getAll(key)
      .filter((v) => typeof v === 'string')
      .join(',');
  }
  return values;
}

export async function submitRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const values = formValues(formData);
  const locale: Locale = (routing.locales as readonly string[]).includes(values['locale'] ?? '')
    ? (values['locale'] as Locale)
    : routing.defaultLocale;

  // Brands with a known model list only accept models from that list. Checked before the
  // other fields so the buyer sees every problem at once.
  const brandId = Number(values['brandId']);
  const typedModel = (values['model'] ?? '').trim();
  const known = Number.isInteger(brandId) && brandId > 0 ? await modelNames(brandId) : [];
  const model = canonicalModel(typedModel, known);
  const modelUnknown = typedModel !== '' && known.length > 0 && !known.includes(model);

  const parsed = buyerRequestInput.safeParse(values);
  if (!parsed.success || modelUnknown) {
    const errors = parsed.success
      ? []
      : [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    if (modelUnknown) errors.push('modelUnknown');
    return { errors, formError: 'generic', values };
  }
  const input = parsed.data;

  let id: string;
  const key = newSecret(24);
  try {
    const [brand] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, input.brandId));
    if (!brand) return { errors: ['brandId'], formError: 'generic', values };

    const [row] = await db
      .insert(buyerRequests)
      .values({
        brandId: input.brandId,
        model,
        yearFrom: input.yearFrom,
        yearTo: input.yearTo ?? null,
        budgetUsd: input.budgetUsd,
        mileageMaxKm: input.mileageMaxKm ?? null,
        fuels: input.fuels,
        sellerTypes: input.sellerTypes,
        gearbox: input.gearbox,
        condition: input.condition,
        wishes: input.wishes,
        importOk: input.importOk,
        region: input.region,
        notes: input.notes,
        accessHash: hashSecret(key),
        accessKeyEncrypted: encryptContact(key),
        notifyVia: input.notifyVia,
        locale,
      })
      .returning({ id: buyerRequests.id });
    id = row!.id;
  } catch (error) {
    console.error('Failed to save buyer request', error);
    return { errors: [], formError: 'server', values };
  }

  redirect({ href: { pathname: '/request/sent', query: { id, key } }, locale });
  return { errors: [], values };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Whether the buyer has confirmed the request in Telegram yet (public requests show this anyway).
export async function requestConfirmedAction(id: string): Promise<boolean> {
  if (typeof id !== 'string' || !UUID.test(id)) return false;
  const [row] = await db
    .select({ verified: buyerRequests.phoneVerified })
    .from(buyerRequests)
    .where(eq(buyerRequests.id, id));
  return row?.verified ?? false;
}

// The buyer changes their own request. Brand and model stay: another car is a new request.
export async function updateRequestAction(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const values = formValues(formData);
  const key = values['key'] ?? '';
  const request = await getRequestByKey(key);
  if (!request) return { errors: [], formError: 'closed', values };
  if (request.status === 'closed') return { errors: [], formError: 'closed', values };

  const parsed = buyerRequestInput.safeParse({
    ...values,
    brandId: String(request.brandId),
    model: request.model,
    consent: 'on',
    notifyVia: 'telegram',
  });
  if (!parsed.success) {
    const errors = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    return { errors, formError: 'generic', values };
  }
  const input = parsed.data;
  const now = new Date();
  if (editsInLastDay(request.recentEdits, now) >= REQUEST_EDITS_PER_DAY) {
    return { errors: [], formError: 'editLimit', values };
  }

  const after = {
    yearFrom: input.yearFrom,
    yearTo: input.yearTo ?? null,
    budgetUsd: input.budgetUsd,
    mileageMaxKm: input.mileageMaxKm ?? null,
    fuels: input.fuels,
    sellerTypes: input.sellerTypes,
    gearbox: input.gearbox,
    condition: input.condition,
    wishes: input.wishes,
    importOk: input.importOk,
    region: input.region,
    notes: input.notes,
  };
  const unchanged = (Object.keys(after) as (keyof typeof after)[]).every(
    (k) => JSON.stringify(after[k]) === JSON.stringify(request[k]),
  );
  const locale = (await getLocale()) as Locale;
  if (unchanged) redirect({ href: `/my/${key}`, locale });

  // Sellers who match only now are alerted by the bot, but only for a published request.
  const targets = (r: {
    sellerTypes: string[];
    region: string;
    importOk: boolean;
    budgetUsd: number;
    yearTo: number | null;
  }) => ({
    brandId: request.brandId,
    sellerTypes: r.sellerTypes,
    region: r.region,
    importOk: r.importOk,
    budgetUsd: r.budgetUsd,
    yearTo: r.yearTo,
  });
  const realert =
    request.status === 'active' && alertTargetsChanged(targets(request), targets(after));
  await db
    .update(buyerRequests)
    .set({
      ...after,
      editedAt: now,
      recentEdits: [
        ...request.recentEdits.filter((t) => now.getTime() - t.getTime() < 86_400_000),
        now,
      ],
      ...(realert && {
        realertFrom: sql`coalesce(${buyerRequests.realertFrom}, ${JSON.stringify(targets(request))}::jsonb)`,
      }),
    })
    .where(eq(buyerRequests.id, request.id));

  if (request.status === 'active') {
    await notifySellersOfRequestChange(request.id, requestChanges(request, after));
  }
  redirect({ href: { pathname: `/my/${key}`, query: { edited: '1' } }, locale });
  return { errors: [], values };
}
