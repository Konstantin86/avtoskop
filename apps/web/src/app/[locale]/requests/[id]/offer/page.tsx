import { getLocale, getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { sellerTypeAllowed } from '@avtoskop/core';
import { formatNumber, fuelsLabel, yearsLabel } from '@/components/requestFormat';
import { Link, redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/server/auth';
import { getOwnOffer, listOfferTemplates } from '@/server/offers';
import { getPublicRequest } from '@/server/requests';
import { OfferForm } from './OfferForm';
import styles from '../../../sellers/forms.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function OfferPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('offer');
  const b = await getTranslations('board');
  const f = await getTranslations('fields');
  const here = `/requests/${id}/offer`;

  const user = await getCurrentUser();
  if (!user || !user.seller) {
    redirect({
      href: user
        ? { pathname: '/sellers/profile', query: { return: here } }
        : { pathname: '/login', query: { return: here } },
      locale: await getLocale(),
    });
    return null;
  }

  const request = await getPublicRequest(id);
  if (!request) {
    return (
      <div className={`container ${styles.page}`}>
        <p>{b('notFound')}</p>
      </div>
    );
  }

  if (!sellerTypeAllowed(request.sellerTypes, user.seller.type)) {
    return (
      <div className={`container ${styles.page}`}>
        <div className={styles.wide}>
          <h1 className={styles.title}>{t('title')}</h1>
          <div className={styles.notice}>
            {t('notAllowed', {
              types: request.sellerTypes
                .map((type) => b(`typeOf_${type}` as 'typeOf_owner'))
                .join(', '),
            })}
          </div>
          <Link href="/requests" className="btn btn-secondary">
            {b('back')}
          </Link>
        </div>
      </div>
    );
  }

  const existing = await getOwnOffer(id, user.seller.id);
  const templates = existing ? [] : await listOfferTemplates(user.seller.id);
  const defaults: Record<string, string> = existing
    ? {
        car: existing.car,
        year: String(existing.year),
        mileageKm: String(existing.mileageKm),
        priceUsd: String(existing.priceUsd),
        availability: existing.availability,
        etaWeeks: existing.etaWeeks ? String(existing.etaWeeks) : '',
        originCountry: existing.originCountry ?? '',
        link: existing.link ?? '',
        description: existing.description,
        features: existing.features.join(','),
        vin: existing.vin ?? '',
      }
    : { car: `${request.brand} ${request.model}`, availability: 'in_ukraine' };

  const regions = (await getMessages()).regions as Record<string, string>;
  const meta = [
    yearsLabel(request),
    fuelsLabel(request.fuels, (x) => f(`fuel_${x}` as 'fuel_hybrid')),
    request.gearbox !== 'any' ? f(`gearbox_${request.gearbox}` as 'gearbox_any') : null,
    b('budget', { amount: formatNumber(locale, request.budgetUsd) }),
    regions[request.region],
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.wide}>
        <Link
          href={`/requests/${id}`}
          style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'none' }}
        >
          {b('back')}
        </Link>
        <h1 className={styles.title}>{t('title')}</h1>
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>{t('forRequest')}</span>
          <span className={styles.summaryTitle}>
            {request.brand} {request.model}
          </span>
          <span className={styles.summaryMeta}>{meta}</span>
        </div>
        {existing && <div className={styles.success}>{t('existing')}</div>}
        <OfferForm
          requestId={id}
          defaults={defaults}
          isUpdate={Boolean(existing)}
          buyerWishes={request.wishes}
          templates={templates}
        />
      </div>
    </div>
  );
}
