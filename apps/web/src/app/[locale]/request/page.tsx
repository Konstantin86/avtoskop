import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getBrandOptions } from '@/server/brands';
import { RequestForm } from './RequestForm';
import { SellerTypesAside } from './SellerTypesAside';
import styles from './request.module.css';

export const dynamic = 'force-dynamic';

const PREFILL = ['brandId', 'model', 'yearFrom', 'budgetUsd', 'region'] as const;

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('request');
  const messages = await getMessages();
  const brands = await getBrandOptions();
  const query = await searchParams;

  const defaults: Record<string, string> = {};
  for (const key of PREFILL) {
    const value = query[key];
    if (typeof value === 'string' && value) defaults[key] = value.slice(0, 60);
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.head}>
        <Link href="/" className={styles.back}>
          {t('back')}
        </Link>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
      </div>
      <div className={styles.layout}>
        <RequestForm
          locale={locale}
          brands={brands}
          regionNames={messages.regions as Record<string, string>}
          defaults={defaults}
        />
        <SellerTypesAside defaults={defaults} />
      </div>
    </div>
  );
}
