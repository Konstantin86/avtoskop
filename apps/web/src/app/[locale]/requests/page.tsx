import type { Metadata } from 'next';
import { REGION_CODES } from '@avtoskop/core';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { RequestCard } from '@/components/RequestCard';
import { Link } from '@/i18n/navigation';
import { getBrandOptions } from '@/server/brands';
import { countPublicRequests, listPublicRequests } from '@/server/requests';
import styles from './board.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'board' });
  return {
    title: `${t('title')} — ${locale === 'uk' ? 'Автоскоп' : 'Avtoskop'}`,
    description: t('lead'),
  };
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('board');
  const regions = (await getMessages()).regions as Record<string, string>;
  const brands = await getBrandOptions();
  const query = await searchParams;

  const brandId = Number(query['brand']) || undefined;
  const region = (REGION_CODES as readonly string[]).includes(String(query['region']))
    ? String(query['region'])
    : undefined;
  const importOnly = query['import'] === '1';
  const filters = { brandId, region, importOnly };
  const [requests, total] = await Promise.all([
    listPublicRequests(filters),
    countPublicRequests(filters),
  ]);
  const filtered = Boolean(brandId || region || importOnly);

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
      </div>

      <form method="get" className={`card ${styles.filters}`}>
        <label className="label">
          {t('filterBrand')}
          <select name="brand" className="field" defaultValue={brandId ? String(brandId) : ''}>
            <option value="">{t('allBrands')}</option>
            {brands.popular.map((b) => (
              <option key={`p${b.id}`} value={b.id}>
                {b.name}
              </option>
            ))}
            <option disabled>──────────</option>
            {brands.all.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          {t('filterRegion')}
          <select name="region" className="field" defaultValue={region ?? 'all'}>
            {[
              'all',
              'kyiv-city',
              ...REGION_CODES.filter((c) => c !== 'all' && c !== 'kyiv-city'),
            ].map((c) => (
              <option key={c} value={c}>
                {regions[c]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" name="import" value="1" defaultChecked={importOnly} />
          {t('filterImport')}
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className="btn btn-blue">
            {t('filterApply')}
          </button>
          {filtered && (
            <Link href="/requests" className="btn btn-secondary">
              {t('filterReset')}
            </Link>
          )}
        </div>
      </form>

      <p className={styles.count}>{t('found', { count: total })}</p>

      {requests.length > 0 ? (
        <div className={styles.grid}>
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      ) : (
        <div className={`card ${styles.empty}`}>
          <h2 className={styles.emptyTitle}>{t('emptyTitle')}</h2>
          <p className={styles.lead}>{t('emptyText')}</p>
          <Link href="/request" className="btn btn-yellow">
            {t('emptyCta')}
          </Link>
        </div>
      )}

      <aside className={styles.sellers}>
        <div>
          <h2 className={styles.sellersTitle}>{t('forSellers')}</h2>
          <p className={styles.lead}>{t('forSellersText')}</p>
        </div>
        <Link href="/sellers" className="btn btn-yellow">
          {t('forSellersCta')}
        </Link>
      </aside>
    </div>
  );
}
