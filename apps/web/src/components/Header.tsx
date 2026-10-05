import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/server/auth';
import { LogoMark, MenuIcon, PersonIcon } from './icons';
import styles from './Header.module.css';

export async function Header() {
  const t = await getTranslations('header');
  const locale = await getLocale();
  const otherLocale = locale === 'uk' ? 'en' : 'uk';
  const user = await getCurrentUser();

  const nav = (
    <>
      <Link href="/#how">{t('how')}</Link>
      <Link href="/requests">{t('requests')}</Link>
      <Link href="/sellers">{t('sellers')}</Link>
    </>
  );
  const account = (
    <Link href={user ? '/account' : '/login'} className={styles.account}>
      <PersonIcon />
      {user ? t('account') : t('signIn')}
    </Link>
  );

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <LogoMark />
          <span>{locale === 'uk' ? 'Автоскоп' : 'Avtoskop'}</span>
        </Link>
        <nav className={styles.nav}>{nav}</nav>
        <div className={styles.actions}>
          <Link
            href="/"
            locale={otherLocale}
            className={styles.locale}
            aria-label={t('switchLocaleLabel')}
          >
            {t('switchLocale')}
          </Link>
          <span className={styles.accountWide}>{account}</span>
          <Link href="/request" className={`btn btn-yellow btn-sm ${styles.cta}`}>
            {t('cta')}
          </Link>
          <details className={styles.menu}>
            <summary aria-label={t('menu')}>
              <MenuIcon />
            </summary>
            <nav className={styles.menuPanel}>
              {nav}
              <hr className={styles.menuLine} />
              {account}
              <Link href="/request" className="btn btn-yellow btn-sm">
                {t('cta')}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
