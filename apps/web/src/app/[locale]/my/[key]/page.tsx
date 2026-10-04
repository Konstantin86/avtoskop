import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ConfirmButton } from '@/components/ConfirmButton';
import { FlagEU, FlagUS } from '@/components/icons';
import { TelegramConfirm } from '@/components/TelegramConfirm';
import { formatNumber, timeAgo, yearsLabel } from '@/components/requestFormat';
import { getRequestByKey, listRequestOffers, markOffersShown } from '@/server/buyer';
import { botStartLink } from '@/server/telegram';
import {
  declineOfferAction,
  restoreOfferAction,
  setRequestOpenAction,
  shareContactAction,
} from '../actions';
import forms from '../../sellers/forms.module.css';
import styles from './my.module.css';

export const dynamic = 'force-dynamic';

// The URL holds the buyer's secret: keep it out of search engines and referrers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type Props = { params: Promise<{ locale: string; key: string }> };

export default async function MyRequestPage({ params }: Props) {
  const { locale, key } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('my');
  const o = await getTranslations('offer');
  const p = await getTranslations('profile');
  const f = await getTranslations('fields');
  const b = await getTranslations('board');

  const request = await getRequestByKey(key);
  if (!request) {
    return (
      <div className={`container ${forms.page}`}>
        <div className={forms.wide}>
          <h1 className={forms.title}>{t('notFoundTitle')}</h1>
          <p className={forms.lead}>{t('notFound')}</p>
        </div>
      </div>
    );
  }

  const offerList = await listRequestOffers(request.id);
  await markOffersShown(request.id);
  const regions = (await getMessages()).regions as Record<string, string>;
  const closed = request.status === 'closed';
  const meta = [
    yearsLabel(request),
    request.fuel !== 'any' ? f(`fuel_${request.fuel}` as 'fuel_any') : null,
    request.gearbox !== 'any' ? f(`gearbox_${request.gearbox}` as 'gearbox_any') : null,
    b('budget', { amount: formatNumber(locale, request.budgetUsd) }),
    regions[request.region],
  ]
    .filter(Boolean)
    .join(' · ');
  const country = (c: string) => (c === 'ua' ? o('origin_ua') : p(`country_${c}` as 'country_us'));

  return (
    <div className={`container ${forms.page}`}>
      <div className={forms.wide}>
        <h1 className={forms.title}>{t('title')}</h1>
        <div className={forms.summary}>
          <span className={forms.summaryLabel}>
            {t('posted', { time: timeAgo(locale, request.createdAt) })}
          </span>
          <span className={forms.summaryTitle}>
            {request.brand} {request.model}
          </span>
          <span className={forms.summaryMeta}>{meta}</span>
        </div>
        {closed && <div className={forms.notice}>{t('closedNotice')}</div>}
        {!closed && !request.phoneVerified && (
          <TelegramConfirm
            href={botStartLink(`req_${request.id}`)}
            confirmed={false}
            title={t('confirmTitle')}
            text={t('confirmText')}
            button={t('confirmButton')}
          />
        )}

        <section className={styles.offers}>
          <h2 className={styles.offersTitle}>{t('offersCount', { count: offerList.length })}</h2>
          {offerList.length === 0 && (
            <p className={forms.lead}>{request.phoneVerified ? t('empty') : t('emptyPending')}</p>
          )}
          {offerList.map((offer) => {
            const declined = offer.status === 'declined';
            const shared = offer.status === 'contact_shared';
            const facts = [
              `${formatNumber(locale, offer.mileageKm)} ${t('km')}`,
              offer.availability === 'in_ukraine'
                ? o('availability_in_ukraine')
                : `${o(`availability_${offer.availability}` as 'availability_in_transit')}, ${t('eta', { weeks: offer.etaWeeks ?? 0 })}`,
              offer.originCountry ? country(offer.originCountry) : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <article
                key={offer.id}
                className={`card ${styles.offer} ${declined ? styles.declined : ''}`}
              >
                <div className={styles.offerTop}>
                  <div>
                    <div className={styles.car}>
                      {offer.car}, {offer.year}
                    </div>
                    <div className={styles.facts}>
                      {offer.originCountry === 'us' && <FlagUS />}
                      {offer.originCountry === 'eu' && <FlagEU />}
                      {facts}
                    </div>
                  </div>
                  <div className={styles.price}>
                    ${formatNumber(locale, offer.priceUsd)}
                    <span>{t('turnkey')}</span>
                  </div>
                </div>
                {offer.description && <p className={styles.description}>{offer.description}</p>}
                {offer.link && (
                  <a
                    href={offer.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={styles.link}
                  >
                    {t('openLink')} ↗
                  </a>
                )}
                <div className={styles.seller}>
                  <div>
                    <div className={styles.sellerName}>{offer.seller.name}</div>
                    <div className={styles.facts}>
                      {p(`type_${offer.seller.type}` as 'type_importer')} ·{' '}
                      {regions[offer.seller.region]}
                      {offer.seller.countries.length > 0 &&
                        ` · ${offer.seller.countries.map(country).join(', ')}`}
                    </div>
                  </div>
                  <span
                    className={`chip ${offer.seller.status === 'verified' ? 'chip-blue' : 'chip-yellow'}`}
                  >
                    {t(offer.seller.status === 'verified' ? 'sellerVerified' : 'sellerNew')}
                  </span>
                </div>
                {offer.seller.about && <p className={styles.about}>{offer.seller.about}</p>}

                <div className={styles.actions}>
                  {shared ? (
                    <div className={forms.success}>{t('shared')}</div>
                  ) : declined ? (
                    <form action={restoreOfferAction} className={styles.inline}>
                      <span className={styles.facts}>{t('declined')}</span>
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="offerId" value={offer.id} />
                      <button type="submit" className="btn btn-secondary btn-sm">
                        {t('restore')}
                      </button>
                    </form>
                  ) : (
                    <>
                      <form action={shareContactAction}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="offerId" value={offer.id} />
                        <ConfirmButton confirm={t('shareConfirm')} className="btn btn-yellow">
                          {t('share')}
                        </ConfirmButton>
                      </form>
                      <form action={declineOfferAction}>
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="offerId" value={offer.id} />
                        <button type="submit" className="btn btn-secondary">
                          {t('decline')}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className={`card ${styles.closeCard}`}>
          <div>
            <h2 className={styles.closeTitle}>{closed ? t('reopenTitle') : t('closeTitle')}</h2>
            <p className={styles.facts}>{closed ? t('reopenText') : t('closeText')}</p>
          </div>
          <form action={setRequestOpenAction}>
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="open" value={closed ? '1' : '0'} />
            <button type="submit" className="btn btn-secondary">
              {closed ? t('reopen') : t('close')}
            </button>
          </form>
        </section>
        <p className={styles.keep}>{t('keepLink')}</p>
      </div>
    </div>
  );
}
