import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { LockIcon, TelegramIcon } from '@/components/icons';
import { Link, redirect } from '@/i18n/navigation';
import { devLoginEnabled, getCurrentUser, getPendingLoginCode, safeReturnTo } from '@/server/auth';
import { devLoginAction, startLoginAction } from '../actions';
import { LoginPoller } from './LoginPoller';
import styles from '../forms.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function JoinPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const query = await searchParams;
  const returnTo = safeReturnTo(query['return']);

  const user = await getCurrentUser();
  if (user) {
    redirect({
      href: user.seller ? returnTo : { pathname: '/sellers/profile', query: { return: returnTo } },
      locale: await getLocale(),
    });
  }

  const bot = process.env['TELEGRAM_BOT_USERNAME'];
  const code = query['step'] === 'telegram' ? await getPendingLoginCode() : null;

  return (
    <div className={`container ${styles.page}`}>
      <div className={`card ${styles.narrow}`}>
        <span className={styles.icon}>
          <TelegramIcon />
        </span>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lead}>{t('lead')}</p>

        {code && bot ? (
          <>
            <ol className={styles.steps}>
              <li>{t('step1')}</li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
            </ol>
            <a
              href={`https://t.me/${bot}?start=login_${code}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-blue btn-lg btn-block"
            >
              {t('openBot')}
            </a>
            <LoginPoller returnTo={returnTo} />
            <Link
              href={{ pathname: '/sellers/join', query: { return: returnTo } }}
              className={styles.secondaryLink}
            >
              {t('retry')}
            </Link>
          </>
        ) : bot ? (
          <form action={startLoginAction}>
            <input type="hidden" name="return" value={returnTo} />
            <button type="submit" className="btn btn-blue btn-lg btn-block">
              <TelegramIcon />
              {t('start')}
            </button>
          </form>
        ) : (
          <p className={styles.notice}>{t('notConfigured')}</p>
        )}

        {devLoginEnabled() && (
          <form action={devLoginAction}>
            <input type="hidden" name="return" value={returnTo} />
            <button type="submit" className="btn btn-secondary btn-block">
              {t('devLogin')}
            </button>
          </form>
        )}

        <p className={styles.privacy}>
          <LockIcon />
          {t('privacy')}
        </p>
      </div>
    </div>
  );
}
