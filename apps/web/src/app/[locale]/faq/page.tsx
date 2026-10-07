import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Faq, type FaqItem } from '@/components/Faq';
import { feedbackUrl } from '@/server/contactLinks';
import styles from './faq.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: t('title'), description: t('lead') };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('faq');
  const feedback = feedbackUrl();
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.inner}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>
        <h2 className={styles.group}>{t('buyers')}</h2>
        <Faq items={t.raw('buyerItems') as FaqItem[]} />
        <h2 className={styles.group}>{t('sellers')}</h2>
        <Faq items={t.raw('sellerItems') as FaqItem[]} />
        {feedback && (
          <div className={`card ${styles.ask}`}>
            <strong>{t('notFound')}</strong>
            <a href={feedback} target="_blank" rel="noopener noreferrer" className="btn btn-blue">
              {t('write')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
