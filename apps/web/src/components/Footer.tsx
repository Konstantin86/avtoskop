import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { feedbackUrl } from '@/server/contactLinks';
import styles from './Footer.module.css';

export async function Footer() {
  const t = await getTranslations('footer');
  const feedback = feedbackUrl();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        {feedback && (
          <a href={feedback} target="_blank" rel="noopener noreferrer" className={styles.feedback}>
            {t('feedback')} →
          </a>
        )}
        <div className={styles.row}>
          <span>
            {t('copyright', { year: new Date().getFullYear() })}
            <span className={styles.small}>{t('trademarks')}</span>
          </span>
          <nav className={styles.links}>
            <Link href="/about">{t('about')}</Link>
            <Link href="/faq">{t('faq')}</Link>
            <Link href="/terms">{t('terms')}</Link>
            <Link href="/privacy">{t('privacy')}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
