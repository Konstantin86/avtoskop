'use server';

import { and, count, eq, gt } from 'drizzle-orm';
import { buyerRequestInput } from '@avtoskop/core';
import { brands, buyerRequests } from '@avtoskop/db';
import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { encryptContact, hashContact } from '@/server/contact';
import { db } from '@/server/db';

const MAX_REQUESTS_PER_PHONE_PER_DAY = 3;

export interface RequestFormState {
  errors: string[];
  formError?: 'generic' | 'limit' | 'server';
  values: Record<string, string>;
}

export async function submitRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'),
  ) as Record<string, string>;
  // Checkboxes repeat the same name; keep all of them, as one comma-separated value.
  values['wishes'] = formData
    .getAll('wishes')
    .filter((v) => typeof v === 'string')
    .join(',');
  const locale: Locale = (routing.locales as readonly string[]).includes(values['locale'] ?? '')
    ? (values['locale'] as Locale)
    : routing.defaultLocale;

  const parsed = buyerRequestInput.safeParse(values);
  if (!parsed.success) {
    const errors = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    return { errors, formError: 'generic', values };
  }
  const input = parsed.data;

  let id: string;
  try {
    const [brand] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, input.brandId));
    if (!brand) return { errors: ['brandId'], formError: 'generic', values };

    const phoneHash = hashContact(input.phone);
    const [recent] = await db
      .select({ n: count() })
      .from(buyerRequests)
      .where(
        and(
          eq(buyerRequests.phoneHash, phoneHash),
          gt(buyerRequests.createdAt, new Date(Date.now() - 86_400_000)),
        ),
      );
    if ((recent?.n ?? 0) >= MAX_REQUESTS_PER_PHONE_PER_DAY)
      return { errors: [], formError: 'limit', values };

    const [row] = await db
      .insert(buyerRequests)
      .values({
        brandId: input.brandId,
        model: input.model,
        yearFrom: input.yearFrom,
        yearTo: input.yearTo ?? null,
        budgetUsd: input.budgetUsd,
        mileageMaxKm: input.mileageMaxKm ?? null,
        fuel: input.fuel,
        gearbox: input.gearbox,
        wishes: input.wishes,
        importOk: input.importOk,
        region: input.region,
        notes: input.notes,
        phoneEncrypted: encryptContact(input.phone),
        phoneHash,
        notifyVia: input.notifyVia,
        locale,
      })
      .returning({ id: buyerRequests.id });
    id = row!.id;
  } catch (error) {
    console.error('Failed to save buyer request', error);
    return { errors: [], formError: 'server', values };
  }

  redirect({ href: { pathname: '/request/sent', query: { id } }, locale });
  return { errors: [], values };
}
