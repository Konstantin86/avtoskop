import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/server/auth';
import { LogoMark, MenuIcon, PersonIcon } from './icons';
import { LocaleSwitch } from './LocaleSwitch';
import { MobileMenu } from './MobileMenu';
import { parseTheme, THEME_COOKIE } from './theme';
import { ThemeToggle } from './ThemeToggle';
import styles from './Header.module.css';

export async function Header() {
  const t = await getTranslations('header');
  const locale = await getLocale();
  const otherLocale: 'uk' | 'en' = locale === 'uk' ? 'en' : 'uk';
  const user = await getCurrentUser();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

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
    // Named so page transitions leave the header in place instead of fading it.
    <header className={styles.header} style={{ viewTransitionName: 'site-header' }}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <LogoMark />
          <span>{locale === 'uk' ? 'Автоскоп' : 'Avtoskop'}</span>
        </Link>
        <nav className={styles.nav}>{nav}</nav>
        <div className={styles.actions}>
          <ThemeToggle initial={theme} />
          <LocaleSwitch
            locale={otherLocale}
            label={t('switchLocale')}
            ariaLabel={t('switchLocaleLabel')}
            className={styles.locale}
          />
          <span className={styles.accountWide}>{account}</span>
          <Link href="/request" className={`btn btn-yellow btn-sm ${styles.cta}`}>
            {t('cta')}
          </Link>
          <MobileMenu
            label={t('menu')}
            icon={<MenuIcon />}
            className={styles.menu}
            panelClassName={styles.menuPanel}
          >
            {nav}
            <hr className={styles.menuLine} />
            {account}
            <Link href="/request" className="btn btn-yellow btn-sm">
              {t('cta')}
            </Link>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
