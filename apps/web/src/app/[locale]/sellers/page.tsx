import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  CheckIcon,
  FlagEU,
  FlagUS,
  KeyIcon,
  PersonIcon,
  StoreIcon,
  TelegramIcon,
} from '@/components/icons';
import { Link } from '@/i18n/navigation';
import { countPublicRequests } from '@/server/requests';
import styles from './sellers.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sellers' });
  return {
    title: `${t('title')} — ${locale === 'uk' ? 'Автоскоп' : 'Avtoskop'}`,
    description: t('lead'),
  };
}

export default async function SellersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sellers');
  const active = await countPublicRequests();

  const who = [
    [
      <span key="flags" className={styles.flags}>
        <FlagUS />
        <FlagEU />
      </span>,
      'whoImporters',
    ],
    [<StoreIcon key="store" />, 'whoDealers'],
    [<KeyIcon key="key" />, 'whoBuyout'],
    [<PersonIcon key="person" />, 'whoOwners'],
  ] as const;
  const rules = ['rule1', 'rule2', 'rule3', 'rule4'] as const;

  return (
    <div className="container">
      <section className={styles.hero}>
        <span className="chip chip-yellow" style={{ alignSelf: 'flex-start' }}>
          {t('eyebrow')}
        </span>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
        <div className={styles.ctas}>
          <Link href="/requests" className="btn btn-yellow btn-lg">
            {t('ctaBoard')}
          </Link>
          <a href="#how" className="btn btn-secondary btn-lg">
            {t('ctaHow')}
          </a>
        </div>
        <Link href="/login" className={styles.signIn}>
          {t('signInLink')} →
        </Link>
        <span className={styles.live}>
          <span className={styles.dot} aria-hidden="true" />
          {t('activeCount', { count: active })}
        </span>
      </section>

      <section id="how" className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('howTitle')}</h2>
        <div className={styles.steps}>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className={`card ${styles.step}`}>
              <span className={styles.stepNum}>{n}</span>
              <h3 className={styles.stepTitle}>{t(`step${n}Title`)}</h3>
              <p className={styles.muted}>{t(`step${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('whoTitle')}</h2>
        <div className={styles.who}>
          {who.map(([icon, key]) => (
            <div key={key} className={`card ${styles.whoItem}`}>
              <span className={styles.whoIcon}>{icon}</span>
              <h3 className={styles.stepTitle}>{t(key)}</h3>
              <p className={styles.muted}>{t(`${key}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.split}>
        <div className={`card ${styles.rules}`}>
          <h2 className={styles.sectionTitle}>{t('rulesTitle')}</h2>
          <ul className={styles.ruleList}>
            {rules.map((r) => (
              <li key={r}>
                <span className={styles.check}>
                  <CheckIcon />
                </span>
                {t(r)}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.side}>
          <div className={styles.price}>
            <h2 className={styles.sideTitle}>{t('priceTitle')}</h2>
            <p className={styles.muted}>{t('priceText')}</p>
          </div>
          <div className={styles.telegram}>
            <span className={styles.tgIcon}>
              <TelegramIcon />
            </span>
            <div>
              <h2 className={styles.sideTitle}>{t('telegramTitle')}</h2>
              <p className={styles.muted}>{t('telegramText')}</p>
            </div>
            <span className="chip chip-blue">{t('telegramSoon')}</span>
          </div>
          <Link href="/requests" className="btn btn-yellow btn-lg btn-block">
            {t('ctaBoard')}
          </Link>
        </div>
      </section>
    </div>
  );
}
