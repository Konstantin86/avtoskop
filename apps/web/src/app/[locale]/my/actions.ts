'use server';

import { and, eq, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { buyerRequests, offers, sellers, users } from '@avtoskop/db';
import { formatNumber, yearsLabel } from '@/components/requestFormat';
import { getRequestByKey } from '@/server/buyer';
import { decryptContact } from '@/server/contact';
import { db } from '@/server/db';
import { sendTelegram } from '@/server/telegram';

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

// Every action re-checks the private key, so an offer id alone grants nothing.
async function ownOffer(formData: FormData) {
  const request = await getRequestByKey(field(formData, 'key'));
  if (!request) return null;
  const [offer] = await db
    .select({
      id: offers.id,
      status: offers.status,
      car: offers.car,
      year: offers.year,
      priceUsd: offers.priceUsd,
      telegramId: users.telegramId,
    })
    .from(offers)
    .innerJoin(sellers, eq(offers.sellerId, sellers.id))
    .innerJoin(users, eq(sellers.userId, users.id))
    .where(and(eq(offers.id, field(formData, 'offerId')), eq(offers.requestId, request.id)));
  return offer ? { request, offer } : null;
}

const refresh = () => revalidatePath('/[locale]/my/[key]', 'page');

export async function shareContactAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  if (!found || found.offer.status === 'contact_shared') return;
  const { request, offer } = found;

  const [updated] = await db
    .update(offers)
    .set({ status: 'contact_shared', contactSharedAt: new Date() })
    .where(and(eq(offers.id, offer.id), ne(offers.status, 'contact_shared')))
    .returning({ id: offers.id });
  if (!updated) return;

  const [row] = await db
    .select({ phone: buyerRequests.phoneEncrypted })
    .from(buyerRequests)
    .where(eq(buyerRequests.id, request.id));
  const t = await getTranslations({ locale: 'uk', namespace: 'notify' });
  const regions = await getTranslations({ locale: 'uk', namespace: 'regions' });
  await sendTelegram(
    offer.telegramId,
    t('contactShared', {
      phone: decryptContact(row!.phone),
      request: `${request.brand} ${request.model} ${yearsLabel(request)}, до $${formatNumber('uk', request.budgetUsd)}, ${regions(request.region as 'kyiv')}`,
      offer: `${offer.car}, ${offer.year}, $${formatNumber('uk', offer.priceUsd)}`,
    }),
  );
  refresh();
}

export async function declineOfferAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  if (!found) return;
  await db
    .update(offers)
    .set({ status: 'declined' })
    .where(and(eq(offers.id, found.offer.id), inArray(offers.status, ['sent', 'shown'])));
  refresh();
}

export async function restoreOfferAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  if (!found) return;
  await db
    .update(offers)
    .set({ status: 'shown' })
    .where(and(eq(offers.id, found.offer.id), eq(offers.status, 'declined')));
  refresh();
}

export async function setRequestOpenAction(formData: FormData): Promise<void> {
  const request = await getRequestByKey(field(formData, 'key'));
  if (!request) return;
  const open = field(formData, 'open') === '1';
  await db
    .update(buyerRequests)
    .set({ status: open ? (request.phoneVerified ? 'active' : 'new') : 'closed' })
    .where(eq(buyerRequests.id, request.id));
  refresh();
}
