import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { SELLER_TYPES } from '@avtoskop/core';
import { LockIcon } from '@/components/icons';
import { Link } from '@/i18n/navigation';
import { getBrandOptions } from '@/server/brands';
import { RequestForm } from './RequestForm';
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
        <aside className={`card ${styles.aside}`}>
          <h2 className={styles.asideTitle}>{t('whoReplies')}</h2>
          {/* The checkboxes belong to the request form through the form attribute. */}
          <div className="choices">
            {SELLER_TYPES.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  name="sellerTypes"
                  value={type}
                  form="request-form"
                  defaultChecked={
                    !defaults['sellerTypes'] || defaults['sellerTypes'].split(',').includes(type)
                  }
                />
                <span>{t(`sellerType_${type}`)}</span>
              </label>
            ))}
          </div>
          <p className="hint">{t('whoRepliesHint')}</p>
          <p className={styles.privacy}>
            <LockIcon />
            {t('privacy')}
          </p>
        </aside>
      </div>
    </div>
  );
}
