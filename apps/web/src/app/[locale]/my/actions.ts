'use server';

import { and, eq, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import {
  BUYER_ASKS,
  CLOSE_REASONS,
  localePath,
  redactContacts,
  reportInput,
  requestExpiry,
  reviewInput,
} from '@avtoskop/core';
import { buyerRequests, offers, reports, sellerReviews, sellers, users } from '@avtoskop/db';
import { formatNumber, yearsLabel } from '@/components/requestFormat';
import { getRequestByKey } from '@/server/buyer';
import { decryptContact } from '@/server/contact';
import { db } from '@/server/db';
import { notifySellersOfClose } from '@/server/notify';
import { sendTelegram, siteUrl } from '@/server/telegram';

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
  // A withdrawn offer can't receive the number: the seller no longer has the car.
  if (!found || found.offer.status === 'contact_shared' || found.offer.status === 'withdrawn')
    return;
  const { request, offer } = found;

  const [row] = await db
    .select({ phone: buyerRequests.phoneEncrypted })
    .from(buyerRequests)
    .where(eq(buyerRequests.id, request.id));
  if (!row?.phone) return;

  const [updated] = await db
    .update(offers)
    .set({ status: 'contact_shared', contactSharedAt: new Date() })
    .where(and(eq(offers.id, offer.id), notInArray(offers.status, ['contact_shared', 'withdrawn'])))
    .returning({ id: offers.id });
  if (!updated) return;

  const t = await getTranslations({ locale: 'uk', namespace: 'notify' });
  const regions = await getTranslations({ locale: 'uk', namespace: 'regions' });
  await sendTelegram(
    offer.telegramId,
    t('contactShared', {
      phone: decryptContact(row.phone),
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
  const given = field(formData, 'reason');
  const reason = (CLOSE_REASONS as readonly string[]).includes(given) ? given : null;
  await db
    .update(buyerRequests)
    .set(
      open
        ? {
            status: request.phoneVerified ? 'active' : 'new',
            // A reopened request gets a fresh 30 days.
            expiresAt: request.phoneVerified ? requestExpiry(new Date()) : null,
            expiryRemindedAt: null,
            closedAt: null,
            closeReason: null,
          }
        : { status: 'closed', closedAt: new Date(), closeReason: reason },
    )
    .where(eq(buyerRequests.id, request.id));
  if (!open && request.status !== 'closed') await notifySellersOfClose(request.id, reason);
  refresh();
}

export async function extendRequestAction(formData: FormData): Promise<void> {
  const request = await getRequestByKey(field(formData, 'key'));
  if (!request || request.status !== 'active') return;
  await db
    .update(buyerRequests)
    .set({ expiresAt: requestExpiry(new Date()), expiryRemindedAt: null })
    .where(eq(buyerRequests.id, request.id));
  refresh();
}

// A complaint also declines the offer, so the buyer no longer sees it as open.
export async function reportOfferAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  const parsed = reportInput.safeParse({
    reason: field(formData, 'reason'),
    comment: field(formData, 'comment'),
  });
  if (!found || !parsed.success) return;
  await db
    .insert(reports)
    .values({ offerId: found.offer.id, ...parsed.data })
    .onConflictDoNothing();
  await db
    .update(offers)
    .set({ status: 'declined' })
    .where(and(eq(offers.id, found.offer.id), inArray(offers.status, ['sent', 'shown'])));
  refresh();
}

// After closing with "found through Avtoskop", the buyer rates the seller they shared their
// number with. One review per request; the seller hears about it in Telegram.
export async function submitReviewAction(formData: FormData): Promise<void> {
  const request = await getRequestByKey(field(formData, 'key'));
  if (!request || request.status !== 'closed') return;
  const parsed = reviewInput.safeParse({
    offerId: field(formData, 'offerId'),
    rating: field(formData, 'rating'),
    comment: field(formData, 'comment'),
  });
  if (!parsed.success) return;
  const [offer] = await db
    .select({ sellerId: offers.sellerId, telegramId: users.telegramId })
    .from(offers)
    .innerJoin(sellers, eq(offers.sellerId, sellers.id))
    .innerJoin(users, eq(sellers.userId, users.id))
    .where(
      and(
        eq(offers.id, parsed.data.offerId),
        eq(offers.requestId, request.id),
        eq(offers.status, 'contact_shared'),
      ),
    );
  if (!offer) return;
  const comment = redactContacts(parsed.data.comment);
  const [saved] = await db
    .insert(sellerReviews)
    .values({
      sellerId: offer.sellerId,
      requestId: request.id,
      rating: parsed.data.rating,
      comment,
    })
    .onConflictDoNothing({ target: sellerReviews.requestId })
    .returning({ id: sellerReviews.id });
  if (saved) {
    const t = await getTranslations({ locale: 'uk', namespace: 'notify' });
    await sendTelegram(
      offer.telegramId,
      t('newReview', {
        request: `${request.brand} ${request.model}`,
        rating: parsed.data.rating,
        comment: comment ? `\n«${comment}»` : '',
      }),
    );
  }
  refresh();
}

// The buyer's own star on an offer, for shortlisting; sellers never see it.
export async function toggleStarAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  if (!found) return;
  await db
    .update(offers)
    .set({ buyerStarred: sql`not ${offers.buyerStarred}` })
    .where(eq(offers.id, found.offer.id));
  refresh();
}

// A private note on an offer, for the buyer only.
export async function saveNoteAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  if (!found) return;
  await db
    .update(offers)
    .set({ buyerNote: field(formData, 'note').trim().slice(0, 500) })
    .where(eq(offers.id, found.offer.id));
  refresh();
}

// One-tap request for a missing detail; the seller gets it in Telegram, once per kind.
export async function askSellerAction(formData: FormData): Promise<void> {
  const found = await ownOffer(formData);
  const kind = field(formData, 'ask');
  if (!found || !(BUYER_ASKS as readonly string[]).includes(kind)) return;
  if (found.offer.status === 'withdrawn' || found.offer.status === 'declined') return;
  const [updated] = await db
    .update(offers)
    .set({ asks: sql`array_append(${offers.asks}, ${kind})` })
    .where(and(eq(offers.id, found.offer.id), sql`not (${kind} = any(${offers.asks}))`))
    .returning({ id: offers.id });
  if (!updated) return;
  const t = await getTranslations({ locale: 'uk', namespace: 'notify' });
  await sendTelegram(
    found.offer.telegramId,
    t('buyerAsks', {
      ask: kind,
      request: `${found.request.brand} ${found.request.model}`,
      offer: `${found.offer.car}, ${found.offer.year}`,
      link: siteUrl() + localePath('uk', `/requests/${found.request.id}/offer`),
    }),
  );
  refresh();
}

// How this buyer wants offer messages: right away or as one morning summary, and quiet nights.
export async function saveNotifyAction(formData: FormData): Promise<void> {
  const request = await getRequestByKey(field(formData, 'key'));
  if (!request) return;
  await db
    .update(buyerRequests)
    .set({
      notifyMode: field(formData, 'mode') === 'digest' ? 'digest' : 'instant',
      quietHours: field(formData, 'quiet') === 'on',
    })
    .where(eq(buyerRequests.id, request.id));
  refresh();
}
