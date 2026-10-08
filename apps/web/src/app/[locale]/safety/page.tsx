import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import styles from '@/components/LegalPage.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'safety' });
  return { title: t('title') };
}

interface Step {
  title: string;
  body: string;
}

// The deal happens outside Avtoskop, so this is the checklist we can offer for it.
export default async function SafetyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('safety');
  const steps = t.raw('steps') as Step[];
  return (
    <div className={`container ${styles.page}`}>
      <article className={styles.doc}>
        <h1>{t('title')}</h1>
        <p className={styles.meta}>{t('lead')}</p>
        {steps.map((s, i) => (
          <section key={s.title}>
            <h2>
              {i + 1}. {s.title}
            </h2>
            <p>{s.body}</p>
          </section>
        ))}
        <p>
          <a
            href="https://wanted.mvs.gov.ua/searchtransport/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('wantedLink')} ↗
          </a>
        </p>
      </article>
    </div>
  );
}
