import type { Metadata } from 'next';
import { getLocale, getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { BrandLogo } from '@/components/BrandLogo';
import { formatNumber, priceLabel, timeAgo, yearsLabel } from '@/components/requestFormat';
import { Link, redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/server/auth';
import { listUserRequests } from '@/server/buyer';
import { feedbackUrl } from '@/server/contactLinks';
import { listOwnOffers } from '@/server/offers';
import { sellerRatings } from '@/server/reviews';
import { listSellerReports, listSellerReviews, sellerStats } from '@/server/sellerAccount';
import { SubmitButton } from '@/components/SubmitButton';
import { listRequestsForSeller } from '@/server/requests';
import { signOutAction } from '../login/actions';
import {
  replyToReportAction,
  replyToReviewAction,
  requestVerifyAction,
  setOfferWithdrawnAction,
} from '../sellers/actions';
import styles from '../sellers/forms.module.css';
import me from './account.module.css';

export const dynamic = 'force-dynamic';

// Request links below carry the buyers' private keys.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

const REQUEST_STATUS_CHIP: Record<string, string> = {
  active: 'chip-blue',
  new: 'chip-yellow',
  closed: '',
};

export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  const p = await getTranslations('profile');
  const a = await getTranslations('auth');
  const b = await getTranslations('board');
  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: { pathname: '/login', query: { return: '/account' } },
      locale: await getLocale(),
    });
    return null;
  }

  const seller = user.seller;
  const [requests, offers, forYou] = await Promise.all([
    listUserRequests(user.telegramId),
    seller ? listOwnOffers(seller.id) : Promise.resolve([]),
    seller ? listRequestsForSeller(seller) : Promise.resolve([]),
  ]);
  const feedback = feedbackUrl();
  const rating = seller ? (await sellerRatings([seller.id])).get(seller.id) : undefined;
  const [stats, complaints, reviews] = seller
    ? await Promise.all([
        sellerStats(seller.id),
        listSellerReports(seller.id),
        listSellerReviews(seller.id),
      ])
    : [null, [], []];
  const my = await getTranslations('my');
  const regions = (await getMessages()).regions as Record<string, string>;
  const sent = (await searchParams)['sent'];

  const requestsSection = (
    <section className={me.offers}>
      <h2 className={me.offersTitle}>{t('requestsTitle')}</h2>
      {requests.length === 0 ? (
        <div className={`card ${me.empty}`}>
          <p className={styles.lead}>{t('noRequests')}</p>
          <Link href="/request" className="btn btn-yellow">
            {t('newRequest')}
          </Link>
        </div>
      ) : (
        <ul className={me.list}>
          {requests.map((r) => (
            <li key={r.id} className={`card ${me.item}`}>
              <div>
                <div className={me.itemTitle}>
                  <BrandLogo name={r.brand} size={28} />
                  {r.brand} {r.model} {yearsLabel(r)}
                </div>
                <div className={me.meta}>
                  {b('budget', { amount: formatNumber(locale, r.budgetUsd) })} · {regions[r.region]}{' '}
                  · {timeAgo(locale, r.createdAt)}
                </div>
                <div className={me.counts}>
                  {t('offerCount', { count: r.offerCount })}
                  {r.newOfferCount > 0 && (
                    <span className="chip chip-yellow">
                      {t('newOffers', { count: r.newOfferCount })}
                    </span>
                  )}
                </div>
              </div>
              <div className={me.itemRight}>
                <span className={`chip ${REQUEST_STATUS_CHIP[r.status] ?? ''}`}>
                  {t(`requestStatus_${r.status}` as 'requestStatus_active')}
                </span>
                {r.key && (
                  <Link href={`/my/${r.key}`} className={me.editLink}>
                    {t('viewOffers')}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className={me.hint}>{t('requestsHint')}</p>
    </section>
  );

  const sellerSection = seller ? (
    <>
      <section className={me.offers}>
        <h2 className={me.offersTitle}>{t('forYouTitle')}</h2>
        {forYou.length === 0 ? (
          <div className={`card ${me.empty}`}>
            <p className={styles.lead}>{t('forYouEmpty')}</p>
            <Link href="/requests" className="btn btn-secondary">
              {t('browse')}
            </Link>
          </div>
        ) : (
          <ul className={me.list}>
            {forYou.map((r) => (
              <li key={r.id} className={`card ${me.item}`}>
                <div>
                  <Link href={`/requests/${r.id}`} className={me.itemTitle}>
                    <BrandLogo name={r.brand} size={28} />
                    {r.brand} {r.model} {yearsLabel(r)}
                  </Link>
                  <div className={me.meta}>
                    {b('budget', { amount: formatNumber(locale, r.budgetUsd) })} ·{' '}
                    {regions[r.region]} · {timeAgo(locale, r.createdAt)}
                  </div>
                </div>
                <Link href={`/requests/${r.id}/offer`} className="btn btn-yellow btn-sm">
                  {t('forYouOffer')}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={me.hint}>{t('forYouHint')}</p>
      </section>

      <section className={`card ${me.profile}`}>
        <div className={me.profileTop}>
          <div>
            <div className={me.name}>{seller.name}</div>
            <div className={me.meta}>
              {p(`type_${seller.type}` as 'type_importer')} · {regions[seller.region]}
              {seller.countries.length > 0 &&
                ` · ${seller.countries.map((c) => p(`country_${c}` as 'country_us')).join(', ')}`}
            </div>
          </div>
          <span className={`chip ${seller.status === 'verified' ? 'chip-blue' : 'chip-yellow'}`}>
            {t(`status_${seller.status}` as 'status_pending')}
          </span>
        </div>
        <Link
          href={{ pathname: '/sellers/profile', query: { return: '/account' } }}
          className={me.editLink}
        >
          {t('editProfile')}
        </Link>
        <div className={me.meta}>
          {rating &&
            `${t('yourRating', { average: rating.average.toFixed(1), count: rating.count })} · `}
          <Link href={`/s/${seller.id}`} className={me.editLink}>
            {t('publicPage')}
          </Link>
        </div>
        <div className={me.meta}>{seller.alerts ? t('alertsOn') : t('alertsOff')}</div>
        {stats && stats.sent > 0 && (
          <div className={me.stats}>
            {t('stats', { sent: stats.sent, viewed: stats.viewed, shared: stats.shared })}
          </div>
        )}
        {seller.status === 'pending' &&
          (seller.verifyRequestedAt ? (
            <p className={me.verify}>{t('verifySent', { evidence: seller.verifyEvidence })}</p>
          ) : (
            <form action={requestVerifyAction} className={me.verifyForm}>
              <label className="label">
                {t('verifyAsk')}
                <input
                  name="evidence"
                  className="field"
                  maxLength={300}
                  placeholder={t('verifyPlaceholder')}
                  required
                />
              </label>
              <div className={me.verifyRow}>
                <SubmitButton className="btn btn-secondary btn-sm">{t('verifySend')}</SubmitButton>
                {feedback && (
                  <a
                    href={feedback}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={me.editLink}
                  >
                    {t('verifyWrite')} →
                  </a>
                )}
              </div>
            </form>
          ))}
      </section>

      {complaints.length > 0 && (
        <section className={me.offers}>
          <h2 className={me.offersTitle}>{t('complaintsTitle')}</h2>
          <p className={me.hint}>{t('complaintsHint')}</p>
          <ul className={me.list}>
            {complaints.map((c) => (
              <li key={c.id} className={`card ${me.complaint}`}>
                <div className={me.itemTitle}>
                  {c.requestBrand} {c.requestModel}: {c.car}, {c.year}
                </div>
                <div className={me.complaintReason}>
                  {my(`reason_${c.reason}` as 'reason_other')}
                  {c.comment && <span className={me.meta}> «{c.comment}»</span>}
                </div>
                {c.sellerReply ? (
                  <p className={me.meta}>{t('complaintReplied', { reply: c.sellerReply })}</p>
                ) : (
                  <form action={replyToReportAction} className={me.replyForm}>
                    <input type="hidden" name="reportId" value={c.id} />
                    <textarea
                      name="reply"
                      className="field"
                      maxLength={1000}
                      placeholder={t('complaintPlaceholder')}
                      required
                    />
                    <SubmitButton className="btn btn-secondary btn-sm">
                      {t('complaintSend')}
                    </SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section className={me.offers}>
          <h2 className={me.offersTitle}>{t('reviewsTitle')}</h2>
          <ul className={me.list}>
            {reviews.map((r) => (
              <li key={r.id} className={`card ${me.complaint}`}>
                <div className={me.stars}>
                  {'★'.repeat(r.rating)}
                  <span className={me.starsOff}>{'★'.repeat(5 - r.rating)}</span>
                </div>
                {r.comment && <p className={me.reviewText}>{r.comment}</p>}
                <details className={me.replyBox} open={false}>
                  <summary>{r.sellerReply ? t('reviewReplyEdit') : t('reviewReply')}</summary>
                  <form action={replyToReviewAction} className={me.replyForm}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <textarea
                      name="reply"
                      className="field"
                      maxLength={500}
                      defaultValue={r.sellerReply}
                      placeholder={t('reviewReplyPlaceholder')}
                    />
                    <SubmitButton className="btn btn-secondary btn-sm">
                      {t('reviewReplySave')}
                    </SubmitButton>
                  </form>
                </details>
                {r.sellerReply && (
                  <p className={me.meta}>{t('yourReply', { reply: r.sellerReply })}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={me.offers}>
        <h2 className={me.offersTitle}>{t('offersTitle')}</h2>
        {offers.length === 0 ? (
          <div className={`card ${me.empty}`}>
            <p className={styles.lead}>{t('noOffers')}</p>
            <Link href="/requests" className="btn btn-yellow">
              {t('browse')}
            </Link>
          </div>
        ) : (
          <ul className={me.list}>
            {offers.map((o) => (
              <li key={o.id} className={`card ${me.item}`}>
                <div>
                  <Link href={`/requests/${o.requestId}`} className={me.itemTitle}>
                    <BrandLogo name={o.requestBrand} size={28} />
                    {o.requestBrand} {o.requestModel}
                  </Link>
                  <div className={me.meta}>
                    {o.car}, {o.year} · {priceLabel(locale, o.priceUsd, o.priceMaxUsd)}
                  </div>
                  {o.asks.length > 0 &&
                    o.requestStatus !== 'closed' &&
                    o.status !== 'withdrawn' &&
                    o.status !== 'declined' && (
                      <div className={me.asks}>
                        {t('buyerAsks', {
                          items: o.asks.map((a) => my(`ask_${a}` as 'ask_vin')).join(', '),
                        })}
                      </div>
                    )}
                  {o.requestStatus === 'closed' && o.closeReason && (
                    <div className={me.meta}>
                      {t(`closedBecause_${o.closeReason}` as 'closedBecause_found_here')}
                    </div>
                  )}
                  {o.buyerPhone && (
                    <div className={me.phone}>
                      {t('buyerPhone')} <a href={`tel:${o.buyerPhone}`}>{o.buyerPhone}</a>
                    </div>
                  )}
                </div>
                <div className={me.itemRight}>
                  {o.requestStatus === 'closed' ? (
                    <span className="chip">{t('requestClosed')}</span>
                  ) : o.status === 'withdrawn' ? (
                    <>
                      <span className="chip">
                        {o.withdrawReason === 'sold' ? t('withdrawnSold') : t('withdrawn')}
                      </span>
                      <form action={setOfferWithdrawnAction}>
                        <input type="hidden" name="offerId" value={o.id} />
                        <button type="submit" className={me.linkButton}>
                          {t('restoreOffer')}
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <span
                        className={`chip ${o.status === 'contact_shared' ? 'chip-yellow' : 'chip-blue'}`}
                      >
                        {t(`offerStatus_${o.status}` as 'offerStatus_sent')}
                      </span>
                      <Link href={`/requests/${o.requestId}/offer`} className={me.editLink}>
                        {t('edit')}
                      </Link>
                      {/* Taking an offer back is rare, so it stays folded. */}
                      <details className={me.withdraw}>
                        <summary>{t('withdraw')}</summary>
                        <form action={setOfferWithdrawnAction} className={me.withdrawForm}>
                          <input type="hidden" name="offerId" value={o.id} />
                          <input type="hidden" name="withdraw" value="1" />
                          <button
                            type="submit"
                            name="reason"
                            value="sold"
                            className="btn btn-secondary btn-sm"
                          >
                            {t('withdrawSold')}
                          </button>
                          <button
                            type="submit"
                            name="reason"
                            value=""
                            className="btn btn-secondary btn-sm"
                          >
                            {t('withdrawOther')}
                          </button>
                        </form>
                      </details>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  ) : (
    <section className={`card ${me.profile}`}>
      <div className={me.name}>{t('becomeSellerTitle')}</div>
      <p className={me.meta}>{t('becomeSellerText')}</p>
      <Link
        href={{ pathname: '/sellers/profile', query: { return: '/account' } }}
        className="btn btn-secondary"
        style={{ alignSelf: 'flex-start' }}
      >
        {t('becomeSeller')}
      </Link>
    </section>
  );

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.wide}>
        <div className={me.head}>
          <h1 className={styles.title}>{t('title')}</h1>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary btn-sm">
              {a('signOut')}
            </button>
          </form>
        </div>
        {sent && (
          <div className={styles.success} role="status">
            {sent === 'updated' ? t('updated') : t('sent')}
          </div>
        )}
        {/* Sellers see their offers first; everyone else sees their requests first. */}
        {seller ? (
          <>
            {sellerSection}
            {requests.length > 0 && requestsSection}
          </>
        ) : (
          <>
            {requestsSection}
            {sellerSection}
          </>
        )}
      </div>
    </div>
  );
}
