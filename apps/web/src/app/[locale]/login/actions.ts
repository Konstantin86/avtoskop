'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import {
  devLogin,
  destroySession,
  pollLogin,
  safeReturnTo,
  startLogin,
  type LoginPoll,
} from '@/server/auth';

export async function startLoginAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formData.get('return'));
  await startLogin(returnTo);
  redirect({
    href: { pathname: '/login', query: { step: 'telegram', return: returnTo } },
    locale: await getLocale(),
  });
}

export async function pollLoginAction(): Promise<LoginPoll> {
  return pollLogin();
}

export async function devLoginAction(formData: FormData): Promise<void> {
  await devLogin();
  redirect({
    href: { pathname: '/login', query: { return: safeReturnTo(formData.get('return')) } },
    locale: await getLocale(),
  });
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect({ href: '/', locale: await getLocale() });
}
