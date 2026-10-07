import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckIcon, LockIcon, LogoMark, ShieldIcon } from '@/components/icons';
import { feedbackUrl, founderName } from '@/server/contactLinks';
import styles from './about.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('title'), description: t('lead') };
}

// The founder's photo is optional: drop it at public/about/founder.jpg.
const PHOTO = '/about/founder.jpg';
const hasPhoto = () => existsSync(join(process.cwd(), 'public', PHOTO));

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const name = founderName();
  const feedback = feedbackUrl();
  const initials = name
    ?.split(/\s+/)
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const values = [
    [LockIcon, 'v1'],
    [ShieldIcon, 'v2'],
    [CheckIcon, 'v3'],
  ] as const;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>

        <section className={`card ${styles.story}`}>
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
          <div className={styles.person}>
            {hasPhoto() ? (
              // A plain img: the file is optional and may change without a rebuild.
              <img src={PHOTO} alt={name ?? ''} className={styles.photo} />
            ) : (
              <span className={styles.initials} aria-hidden="true">
                {initials || <LogoMark size={56} />}
              </span>
            )}
            <div>
              <div className={styles.name}>{name ? t('signed', { name }) : t('team')}</div>
              {feedback && (
                <a
                  href={feedback}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.write}
                >
                  {t('write')} →
                </a>
              )}
            </div>
          </div>
        </section>

        <section className={styles.values}>
          {values.map(([Icon, key]) => (
            <div key={key} className={`card ${styles.value}`}>
              <span className={styles.valueIcon}>
                <Icon />
              </span>
              <strong>{t(`${key}Title`)}</strong>
              <span className={styles.muted}>{t(`${key}Text`)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
