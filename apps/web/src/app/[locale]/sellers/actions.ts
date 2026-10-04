'use server';

import { eq } from 'drizzle-orm';
import { getLocale } from 'next-intl/server';
import { offerInput, sellerProfileInput } from '@avtoskop/core';
import { buyerRequests, offers, sellers } from '@avtoskop/db';
import { redirect } from '@/i18n/navigation';
import {
  devLogin,
  destroySession,
  getCurrentUser,
  pollLogin,
  safeReturnTo,
  startLogin,
  type LoginPoll,
} from '@/server/auth';
import { db } from '@/server/db';

export interface FormState {
  errors: string[];
  formError?: string;
  values: Record<string, string>;
}

function formValues(formData: FormData, multi: string[] = []): Record<string, string> {
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'),
  ) as Record<string, string>;
  for (const key of multi) {
    values[key] = formData
      .getAll(key)
      .filter((v) => typeof v === 'string')
      .join(',');
  }
  return values;
}

export async function startLoginAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get('return'));
  await startLogin(returnTo);
  redirect({
    href: { pathname: '/sellers/join', query: { step: 'telegram', return: returnTo } },
    locale: await getLocale(),
  });
}

export async function pollLoginAction(): Promise<LoginPoll> {
  return pollLogin();
}

export async function devLoginAction(formData: FormData): Promise<void> {
  await devLogin();
  redirect({
    href: { pathname: '/sellers/join', query: { return: safeReturnTo(formData.get('return')) } },
    locale: await getLocale(),
  });
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect({ href: '/', locale: await getLocale() });
}

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ['countries']);
  const user = await getCurrentUser();
  if (!user) return { errors: [], formError: 'generic', values };

  const parsed = sellerProfileInput.safeParse(values);
  if (!parsed.success) {
    return {
      errors: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
      formError: 'generic',
      values,
    };
  }
  await db
    .insert(sellers)
    .values({ userId: user.userId, ...parsed.data })
    .onConflictDoUpdate({ target: sellers.userId, set: { ...parsed.data, updatedAt: new Date() } });

  redirect({ href: safeReturnTo(values['return']), locale: await getLocale() });
  return { errors: [], values };
}

export async function saveOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const user = await getCurrentUser();
  if (!user?.seller) return { errors: [], formError: 'generic', values };

  const requestId = values['requestId'] ?? '';
  const [request] = await db
    .select({ id: buyerRequests.id, status: buyerRequests.status })
    .from(buyerRequests)
    .where(eq(buyerRequests.id, requestId));
  if (!request || !['new', 'active'].includes(request.status)) {
    return { errors: [], formError: 'closed', values };
  }

  const parsed = offerInput.safeParse(values);
  if (!parsed.success) {
    return {
      errors: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
      formError: 'generic',
      values,
    };
  }
  const o = parsed.data;
  const row = {
    car: o.car,
    year: o.year,
    mileageKm: o.mileageKm,
    priceUsd: o.priceUsd,
    availability: o.availability,
    etaWeeks: o.availability === 'in_ukraine' ? null : (o.etaWeeks ?? null),
    originCountry: o.originCountry ?? null,
    link: o.link ?? null,
    description: o.description,
  };
  await db
    .insert(offers)
    .values({ requestId, sellerId: user.seller.id, ...row })
    .onConflictDoUpdate({
      target: [offers.requestId, offers.sellerId],
      set: { ...row, updatedAt: new Date() },
    });

  redirect({ href: { pathname: '/sellers/me', query: { sent: '1' } }, locale: await getLocale() });
  return { errors: [], values };
}
