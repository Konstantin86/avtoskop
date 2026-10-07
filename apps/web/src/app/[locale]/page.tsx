import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { localePath } from '@avtoskop/core';
import { BrandModelFields } from '@/components/BrandModelFields';
import { CarDrawing, RoadScene } from '@/components/CarScene';
import { Compare } from '@/components/Compare';
import {
  CarIcon,
  CheckIcon,
  LockIcon,
  OffersIcon,
  PersonIcon,
  PhoneCheckIcon,
  TelegramIcon,
} from '@/components/icons';
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
  const stepIcons = {
    1: <CarIcon size={30} />,
    2: <OffersIcon size={30} />,
    3: <PhoneCheckIcon size={30} />,
  };
  const trust = [
    [CheckIcon, 'perk1'],
    [TelegramIcon, 'perk2'],
    [PersonIcon, 'perk3'],
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
          </div>
          <span className={styles.sources}>{t('note')}</span>
        </div>

        <form
          action={localePath(locale, '/request')}
          method="get"
          className={`card ${styles.quick}`}
        >
          <div className={styles.quickHead}>
            <h2 className={styles.quickTitle}>{t('cardTitle')}</h2>
            <p className="hint" style={{ fontSize: 14 }}>
              {t('cardSubtitle')}
            </p>
          </div>
          <div className={styles.pair}>
            <BrandModelFields
              idPrefix="q"
              brands={brands}
              labels={{
                brand: f('brand'),
                model: f('model'),
                brandPlaceholder: f('brandPlaceholder'),
                modelPlaceholder: f('modelPlaceholder'),
                noMatches: f('modelNoMatches'),
                popular: f('popularBrands'),
                all: f('allBrands'),
              }}
            />
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

      <RoadScene />

      <section id="how" className={styles.how}>
        <h2 className={styles.sectionTitle}>{t('howTitle')}</h2>
        <div className={styles.steps}>
          {steps.map((n) => (
            <div key={n} className={`card ${styles.step}`}>
              <div className={styles.stepTop}>
                <span className={styles.stepNum}>{n}</span>
                <span className={styles.stepIcon}>{stepIcons[n]}</span>
              </div>
              <h3 className={styles.stepTitle}>{t(`step${n}Title`)}</h3>
              <p className={styles.stepText}>{t(`step${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <Compare
        title={t('whyTitle')}
        lead={t('whyLead')}
        before={t('whyBefore')}
        after={t('whyAfter')}
        rows={([1, 2, 3, 4, 5, 6] as const).map((n) => ({
          before: t(`why${n}Before`),
          after: t(`why${n}After`),
        }))}
      />

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

      <section className={styles.finalCta}>
        <CarDrawing className={styles.finalCar} />
        <h2 className={styles.sectionTitle}>{t('finalTitle')}</h2>
        <Link href="/request" className="btn btn-yellow btn-lg">
          {t('ctaRequest')}
        </Link>
        <span className={styles.sources}>{t('finalNote')}</span>
      </section>
    </div>
  );
}
