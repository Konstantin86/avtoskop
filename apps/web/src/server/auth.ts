import 'server-only';
import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { hashSecret, newSecret } from '@avtoskop/core';
import { loginTokens, sellers, sessions, users } from '@avtoskop/db';
import { db } from './db';

const SESSION_COOKIE = 'avt_session';
const LOGIN_COOKIE = 'avt_login';
const SESSION_DAYS = 30;
const LOGIN_MINUTES = 10;

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Browsers drop secure cookies on plain http, e.g. a home server reached by IP.
  secure: (process.env['SITE_URL'] ?? '').startsWith('https://'),
  path: '/',
};

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      userId: users.id,
      telegramId: users.telegramId,
      name: users.name,
      telegramUsername: users.telegramUsername,
      seller: {
        id: sellers.id,
        type: sellers.type,
        name: sellers.name,
        region: sellers.region,
        countries: sellers.countries,
        about: sellers.about,
        status: sellers.status,
        brandIds: sellers.brandIds,
        serviceRegions: sellers.serviceRegions,
        alerts: sellers.alerts,
        budgetMinUsd: sellers.budgetMinUsd,
        verifyEvidence: sellers.verifyEvidence,
        verifyRequestedAt: sellers.verifyRequestedAt,
        yearMin: sellers.yearMin,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(sellers, eq(sellers.userId, users.id))
    .where(and(eq(sessions.id, hashSecret(token)), gt(sessions.expiresAt, new Date())));
  return row ?? null;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function createSession(userId: string): Promise<void> {
  const token = newSecret(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ id: hashSecret(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashSecret(token)));
  jar.delete(SESSION_COOKIE);
}

// The sign-in code lives in an httpOnly cookie of the browser that started sign-in,
// so only that browser can complete it.
export async function startLogin(returnTo: string): Promise<string> {
  const code = newSecret(18);
  const expiresAt = new Date(Date.now() + LOGIN_MINUTES * 60_000);
  await db.insert(loginTokens).values({ id: hashSecret(code), returnTo, expiresAt });
  (await cookies()).set(LOGIN_COOKIE, code, { ...cookieBase, expires: expiresAt });
  return code;
}

export async function getPendingLoginCode(): Promise<string | null> {
  return (await cookies()).get(LOGIN_COOKIE)?.value ?? null;
}

export type LoginPoll =
  { status: 'waiting' } | { status: 'expired' } | { status: 'done'; next: string };

export async function pollLogin(): Promise<LoginPoll> {
  const jar = await cookies();
  const code = jar.get(LOGIN_COOKIE)?.value;
  if (!code) return { status: 'expired' };
  const [token] = await db
    .select()
    .from(loginTokens)
    .where(eq(loginTokens.id, hashSecret(code)));
  if (!token || token.expiresAt < new Date() || token.status === 'used') {
    jar.delete(LOGIN_COOKIE);
    return { status: 'expired' };
  }
  if (token.status !== 'confirmed' || !token.userId) return { status: 'waiting' };

  await db.update(loginTokens).set({ status: 'used' }).where(eq(loginTokens.id, token.id));
  await createSession(token.userId);
  jar.delete(LOGIN_COOKIE);
  return { status: 'done', next: token.returnTo ?? '/account' };
}

export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env['AVTOSKOP_DEV_LOGIN'] === '1';
}

// Local development only: a fixed test seller account without Telegram.
export async function devLogin(): Promise<void> {
  if (!devLoginEnabled()) throw new Error('Dev login is disabled');
  const [user] = await db
    .insert(users)
    .values({ telegramId: -1, name: 'Тестовий продавець' })
    .onConflictDoUpdate({ target: users.telegramId, set: { name: 'Тестовий продавець' } })
    .returning({ id: users.id });
  await createSession(user!.id);
}

// Only same-site paths are allowed as a destination after sign-in.
export function safeReturnTo(value: unknown, fallback = '/account'): string {
  return typeof value === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(value) ? value : fallback;
}
