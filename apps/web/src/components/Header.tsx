import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/server/auth';
import { countNewOffers } from '@/server/buyer';
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
  const newOffers = user ? await countNewOffers(user.telegramId) : 0;
  const newLabel = newOffers > 0 ? t('newOffers', { count: newOffers }) : '';

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
      {newOffers > 0 && (
        <span className={styles.badge} title={newLabel}>
          {newOffers > 9 ? '9+' : newOffers}
          <span className="visually-hidden">, {newLabel}</span>
        </span>
      )}
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
            label={newOffers > 0 ? `${t('menu')}, ${newLabel}` : t('menu')}
            icon={
              <span className={styles.menuIcon}>
                <MenuIcon />
                {newOffers > 0 && <span className={styles.dot} />}
              </span>
            }
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
