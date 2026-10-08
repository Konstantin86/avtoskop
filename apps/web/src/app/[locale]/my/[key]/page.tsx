import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { BrandLogo } from '@/components/BrandLogo';
import { OfferCard, OfferDeclineActions } from '@/components/OfferCard';
import { ShareNumberButton } from '@/components/ShareNumberButton';
import { SubmitButton } from '@/components/SubmitButton';
import {
  makeMatchesBrand,
  MIN_SELLERS_TO_SHOW,
  matchedWishes,
  REPORT_REASONS,
  vinMismatches,
  WISHES,
} from '@avtoskop/core';
import { FlagEU, FlagUS, ShieldIcon } from '@/components/icons';
import { TelegramConfirm } from '@/components/TelegramConfirm';
import {
  formatNumber,
  fuelsLabel,
  priceLabel,
  timeAgo,
  yearsLabel,
} from '@/components/requestFormat';
import { RefreshOnce } from '@/components/RefreshOnce';
import { autoriaLinkFor } from '@/server/autoria';
import { photosForOffers, photoUrl } from '@/server/photos';
import { PhotoGallery } from '@/components/PhotoGallery';
import { getRequestByKey, listRequestOffers, markOffersShown } from '@/server/buyer';
import { botStartLink } from '@/server/telegram';
import { wantedByVin, wantedListDate } from '@/server/vin';
import {
  declineOfferAction,
  extendRequestAction,
  reportOfferAction,
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
  const photos = await photosForOffers(offerList.map((o) => o.id));
  const autoria =
    request.status !== 'closed' && request.phoneVerified ? await autoriaLinkFor(request) : null;
  const [wanted, wantedDate] = await Promise.all([
    wantedByVin(offerList.flatMap((o) => (o.vin ? [o.vin] : []))),
    wantedListDate(),
  ]);
  const shortDate = (d: Date) => d.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB');
  const hadNew = offerList.some((o) => o.status === 'sent');
  await markOffersShown(request.id);
  const regions = (await getMessages()).regions as Record<string, string>;
  const closed = request.status === 'closed';
  const meta = [
    yearsLabel(request),
    fuelsLabel(request.fuels, (x) => f(`fuel_${x}` as 'fuel_hybrid')),
    request.gearbox !== 'any' ? f(`gearbox_${request.gearbox}` as 'gearbox_any') : null,
    b('budget', { amount: formatNumber(locale, request.budgetUsd) }),
    regions[request.region],
  ]
    .filter(Boolean)
    .join(' · ');
  const featureLabel = (feature: string) =>
    (WISHES as readonly string[]).includes(feature)
      ? f(`wish_${feature}` as 'wish_awd')
      : o(`feature_${feature}` as 'feature_warranty');
  const country = (c: string) => (c === 'ua' ? o('origin_ua') : p(`country_${c}` as 'country_us'));

  return (
    <div className={`container ${forms.page}`}>
      <div className={forms.wide}>
        {hadNew && <RefreshOnce />}
        <h1 className={forms.title}>{t('title')}</h1>
        <div className={forms.summary}>
          <span className={forms.summaryLabel}>
            {t('posted', { time: timeAgo(locale, request.createdAt) })}
          </span>
          <span className={forms.summaryTitle}>
            <BrandLogo name={request.brand} size={28} />
            {request.brand} {request.model}
          </span>
          <span className={forms.summaryMeta}>{meta}</span>
          {/* Where things stand, at a glance. */}
          <span className={styles.status}>
            <span
              className={
                closed
                  ? styles.statusOff
                  : request.phoneVerified
                    ? styles.statusOn
                    : styles.statusWait
              }
            >
              {closed
                ? t('statusClosed')
                : request.phoneVerified
                  ? t('statusPublished')
                  : t('statusWaiting')}
            </span>
            {!closed && request.phoneVerified && request.alertedSellers >= MIN_SELLERS_TO_SHOW && (
              <span>{t('reached', { count: request.alertedSellers })}</span>
            )}
            <span>{t('offersCount', { count: offerList.length })}</span>
          </span>
        </div>
        {closed && <div className={forms.notice}>{t('closedNotice')}</div>}
        {!closed && request.expiresAt && (
          <div className={styles.expiry}>
            <span>{t('activeUntil', { date: shortDate(request.expiresAt) })}</span>
            {request.expiresAt.getTime() - Date.now() < 7 * 86_400_000 && (
              <form action={extendRequestAction}>
                <input type="hidden" name="key" value={key} />
                <SubmitButton className="btn btn-secondary btn-sm">{t('extend')}</SubmitButton>
              </form>
            )}
          </div>
        )}
        {!closed && !request.phoneVerified && (
          <TelegramConfirm
            href={botStartLink(`req_${request.id}`)}
            confirmed={false}
            title={t('confirmTitle')}
            text={t('confirmText')}
            button={t('confirmButton')}
            requestId={request.id}
            qrCaption={t('confirmQr')}
          />
        )}

        <section className={styles.offers}>
          <h2 className={styles.offersTitle}>{t('offersCount', { count: offerList.length })}</h2>
          {offerList.length > 0 && (
            <div className={styles.warning}>
              <ShieldIcon />
              <div>
                <strong>{t('safetyTitle')}</strong>
                <ul>
                  <li>{t('safety1')}</li>
                  <li>{t('safety2')}</li>
                  <li>{t('safety3')}</li>
                </ul>
              </div>
            </div>
          )}
          {offerList.length === 0 && (
            <p className={forms.lead}>{request.phoneVerified ? t('empty') : t('emptyPending')}</p>
          )}
          {offerList.map((offer) => {
            const declined = offer.status === 'declined';
            const shared = offer.status === 'contact_shared';
            const order = offer.availability === 'to_order';
            const facts = [
              offer.mileageKm === null
                ? null
                : order
                  ? t('mileageUpTo', { km: formatNumber(locale, offer.mileageKm) })
                  : `${formatNumber(locale, offer.mileageKm)} ${t('km')}`,
              offer.availability === 'in_ukraine'
                ? o('availability_in_ukraine')
                : `${o(`availability_${offer.availability}` as 'availability_in_transit')}, ${t('eta', { weeks: offer.etaWeeks ?? 0 })}`,
              offer.originCountry ? country(offer.originCountry) : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <OfferCard
                key={offer.id}
                declined={declined}
                className={`card ${styles.offer}`}
                declinedClassName={styles.declined ?? ''}
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
                    {priceLabel(locale, offer.priceUsd, offer.priceMaxUsd)}
                    <span>{t('turnkey')}</span>
                    {offer.serviceFeeUsd !== null && (
                      <span>
                        {t('serviceFee', { amount: formatNumber(locale, offer.serviceFeeUsd) })}
                      </span>
                    )}
                  </div>
                </div>
                <PhotoGallery
                  photos={(photos.get(offer.id) ?? []).map((p) => ({
                    full: photoUrl(p.key),
                    thumb: photoUrl(p.key, 'thumb'),
                  }))}
                  alt={`${offer.car}, ${offer.year}`}
                  labels={{
                    open: t('photoOpen'),
                    close: t('photoClose'),
                    prev: t('photoPrev'),
                    next: t('photoNext'),
                  }}
                />
                {order && <p className={styles.orderNote}>{t('orderNote')}</p>}
                {offer.vin && (
                  <div className={styles.vin}>
                    <div>
                      <span className={styles.vinLabel}>VIN</span> <code>{offer.vin}</code>
                    </div>
                    {wanted.has(offer.vin) ? (
                      <div className={styles.vinBad}>
                        ⚠ {t('vinWanted', { date: wantedDate ? shortDate(wantedDate) : '' })}
                      </div>
                    ) : (
                      wantedDate && (
                        <div className={styles.vinGood}>
                          ✓ {t('vinNotWanted', { date: shortDate(wantedDate) })}
                        </div>
                      )
                    )}
                    <a
                      href="https://wanted.mvs.gov.ua/searchtransport/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.vinLink}
                    >
                      {t('vinCheckOfficial', { last6: offer.vin.slice(-6) })} ↗
                    </a>
                    {offer.vinDecoded &&
                      (() => {
                        const d = offer.vinDecoded;
                        const car = [d.make, d.model, d.year].filter(Boolean).join(' ');
                        if (!makeMatchesBrand(d.make, request.brand)) {
                          return (
                            <div className={styles.vinWarn}>
                              ⚠ {t('vinOtherBrand', { make: d.make, brand: request.brand })}
                            </div>
                          );
                        }
                        return vinMismatches(offer, d).length > 0 ? (
                          <div className={styles.vinWarn}>⚠ {t('vinMismatch', { car })}</div>
                        ) : (
                          <div className={styles.vinGood}>✓ {t('vinMatches', { car })}</div>
                        );
                      })()}
                    <span className={styles.claim}>{t('vinSources')}</span>
                  </div>
                )}
                {offer.features.length > 0 && (
                  <div className={styles.features}>
                    {request.wishes.length > 0 && (
                      <span className={styles.match}>
                        ✓{' '}
                        {t('wishMatch', {
                          matched: matchedWishes(request.wishes, offer.features).length,
                          total: request.wishes.length,
                        })}
                      </span>
                    )}
                    <ul className={styles.featureList}>
                      {offer.features.map((feature) => (
                        <li
                          key={feature}
                          className={`chip ${request.wishes.includes(feature) ? 'chip-blue' : ''}`}
                        >
                          {featureLabel(feature)}
                        </li>
                      ))}
                    </ul>
                    <span className={styles.claim}>{t('sellerClaims')}</span>
                  </div>
                )}
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
                  ) : offer.reported ? (
                    <span className={styles.facts}>{t('reported')}</span>
                  ) : (
                    <OfferDeclineActions
                      fields={{ key, offerId: offer.id }}
                      decline={declineOfferAction}
                      restore={restoreOfferAction}
                      inlineClassName={styles.inline ?? ''}
                      noteClassName={styles.facts ?? ''}
                      labels={{
                        decline: t('decline'),
                        declined: t('declined'),
                        restore: t('restore'),
                      }}
                      share={
                        <ShareNumberButton
                          action={shareContactAction}
                          fields={{ key, offerId: offer.id }}
                          labels={{
                            open: t('share'),
                            title: t('shareTitle', { seller: offer.seller.name }),
                            text: t('shareText'),
                            safety: t('shareSafety'),
                            confirm: t('shareYes'),
                            cancel: t('shareCancel'),
                          }}
                        />
                      }
                    />
                  )}
                </div>
                {!offer.reported && (
                  <details className={styles.report}>
                    <summary>{t('report')}</summary>
                    <form action={reportOfferAction} className={styles.reportForm}>
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="offerId" value={offer.id} />
                      <div className="choices">
                        {REPORT_REASONS.map((r, i) => (
                          <label key={r}>
                            <input type="radio" name="reason" value={r} defaultChecked={i === 0} />
                            <span>{t(`reason_${r}`)}</span>
                          </label>
                        ))}
                      </div>
                      <textarea
                        name="comment"
                        className="field"
                        maxLength={500}
                        placeholder={t('reportComment')}
                      />
                      <SubmitButton className="btn btn-secondary btn-sm">
                        {t('reportSend')}
                      </SubmitButton>
                    </form>
                  </details>
                )}
              </OfferCard>
            );
          })}
        </section>
        {autoria && (
          <div className={`card ${styles.autoria}`}>
            <div>
              <div className={styles.autoriaTitle}>{t('autoriaTitle')}</div>
              <p className={styles.autoriaText}>{t('autoriaText')}</p>
            </div>
            <a
              href={autoria}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn btn-secondary btn-sm"
            >
              {t('autoriaButton')} ↗
            </a>
          </div>
        )}

        <section className={`card ${styles.closeCard}`}>
          <div>
            <h2 className={styles.closeTitle}>{closed ? t('reopenTitle') : t('closeTitle')}</h2>
            <p className={styles.facts}>{closed ? t('reopenText') : t('closeText')}</p>
          </div>
          <form action={setRequestOpenAction}>
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="open" value={closed ? '1' : '0'} />
            <SubmitButton className="btn btn-secondary">
              {closed ? t('reopen') : t('close')}
            </SubmitButton>
          </form>
        </section>
        <p className={styles.keep}>{t('keepLink')}</p>
      </div>
    </div>
  );
}
