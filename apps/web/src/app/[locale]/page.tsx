import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { BrandSelect } from '@/components/BrandSelect';
import { GaugeIcon, LockIcon, ShieldIcon } from '@/components/icons';
import { RegionSelect } from '@/components/RegionSelect';
import { Link } from '@/i18n/navigation';
import { getBrandOptions } from '@/server/brands';
import styles from './home.module.css';

export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const f = await getTranslations('fields');
  const messages = await getMessages();
  const brands = await getBrandOptions();
  const year = new Date().getFullYear();

  const steps = [1, 2, 3] as const;
  const trust = [
    [LockIcon, 'trust1'],
    [ShieldIcon, 'trust2'],
    [GaugeIcon, 'trust3'],
  ] as const;

  return (
    <div className="container">
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className="chip chip-yellow" style={{ alignSelf: 'flex-start' }}>
            {t('eyebrow')}
          </span>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lead}>{t('lead')}</p>
          <div className={styles.ctas}>
            <Link href="/request" className="btn btn-yellow btn-lg">
              {t('ctaRequest')}
            </Link>
            <span className={styles.searchSoon}>
              <span className="btn btn-secondary btn-lg" aria-disabled="true">
                {t('ctaSearch')}
              </span>
            </span>
          </div>
          <span className={styles.sources}>{t('sources')}</span>
        </div>

        <form action={`/${locale}/request`} method="get" className={`card ${styles.quick}`}>
          <div className={styles.quickHead}>
            <h2 className={styles.quickTitle}>{t('cardTitle')}</h2>
            <p className="hint" style={{ fontSize: 14 }}>
              {t('cardSubtitle')}
            </p>
          </div>
          <div className={styles.pair}>
            <label className="label" htmlFor="q-brand">
              {f('brand')}
              <BrandSelect
                id="q-brand"
                brands={brands}
                labels={{
                  placeholder: f('brandPlaceholder'),
                  popular: f('popularBrands'),
                  all: f('allBrands'),
                }}
              />
            </label>
            <label className="label">
              {f('model')}
              <input
                name="model"
                className="field"
                placeholder={f('modelPlaceholder')}
                maxLength={60}
              />
            </label>
          </div>
          <div className={styles.pair}>
            <label className="label">
              {f('yearFrom')}
              <input
                name="yearFrom"
                className="field"
                inputMode="numeric"
                placeholder={String(year - 6)}
              />
            </label>
            <label className="label">
              {f('budget')}
              <input name="budgetUsd" className="field" inputMode="numeric" placeholder="28000" />
            </label>
          </div>
          <label className="label" htmlFor="q-region">
            {f('region')}
            <RegionSelect id="q-region" names={messages.regions as Record<string, string>} />
          </label>
          <button type="submit" className="btn btn-yellow btn-lg btn-block">
            {t('cardSubmit')}
          </button>
          <span className={styles.note}>
            <LockIcon />
            {t('cardNote')}
          </span>
        </form>
      </section>

      <section id="how" className={styles.how}>
        <h2 className={styles.sectionTitle}>{t('howTitle')}</h2>
        <div className={styles.steps}>
          {steps.map((n) => (
            <div key={n} className={`card ${styles.step}`}>
              <span className={styles.stepNum}>{n}</span>
              <h3 className={styles.stepTitle}>{t(`step${n}Title`)}</h3>
              <p className={styles.stepText}>{t(`step${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.trust}>
        {trust.map(([Icon, key]) => (
          <div key={key} className={styles.trustItem}>
            <span className={styles.trustIcon}>
              <Icon />
            </span>
            <div>
              <div className={styles.trustTitle}>{t(`${key}Title`)}</div>
              <div className={styles.trustText}>{t(`${key}Text`)}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
