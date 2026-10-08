import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { feedbackUrl } from '@/server/contactLinks';
import styles from './Footer.module.css';

// One row on wide screens: copyright on the left, links on the right, with the feedback
// link first and in colour, since early users' feedback matters most.
export async function Footer() {
  const t = await getTranslations('footer');
  const feedback = feedbackUrl();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.about}>
          {t('copyright', { year: new Date().getFullYear() })}{' '}
          <span className={styles.small}>{t('trademarks')}</span>
        </p>
        <nav className={styles.links}>
          {feedback && (
            <a
              href={feedback}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.feedback}
            >
              {t('feedback')} →
            </a>
          )}
          <Link href="/about">{t('about')}</Link>
          <Link href="/faq">{t('faq')}</Link>
          <Link href="/terms">{t('terms')}</Link>
          <Link href="/privacy">{t('privacy')}</Link>
        </nav>
      </div>
    </footer>
  );
}
