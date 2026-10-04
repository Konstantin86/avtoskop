import { getLocale, getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { formatNumber } from '@/components/requestFormat';
import { Link, redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/server/auth';
import { listOwnOffers } from '@/server/offers';
import { signOutAction } from '../actions';
import styles from '../forms.module.css';
import me from './me.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  const p = await getTranslations('profile');
  const a = await getTranslations('auth');
  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: { pathname: '/sellers/join', query: { return: '/sellers/me' } },
      locale: await getLocale(),
    });
    return null;
  }
  if (!user.seller) {
    redirect({
      href: { pathname: '/sellers/profile', query: { return: '/sellers/me' } },
      locale: await getLocale(),
    });
    return null;
  }

  const seller = user.seller;
  const offers = await listOwnOffers(seller.id);
  const regions = (await getMessages()).regions as Record<string, string>;
  const sent = (await searchParams)['sent'] === '1';

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.wide}>
        <div className={me.head}>
          <h1 className={styles.title}>{t('title')}</h1>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary btn-sm">
              {a('signOut')}
            </button>
          </form>
        </div>
        {sent && (
          <div className={styles.success} role="status">
            {t('sent')}
          </div>
        )}

        <section className={`card ${me.profile}`}>
          <div className={me.profileTop}>
            <div>
              <div className={me.name}>{seller.name}</div>
              <div className={me.meta}>
                {p(`type_${seller.type}` as 'type_importer')} · {regions[seller.region]}
                {seller.countries.length > 0 &&
                  ` · ${seller.countries.map((c) => p(`country_${c}` as 'country_us')).join(', ')}`}
              </div>
            </div>
            <span className={`chip ${seller.status === 'verified' ? 'chip-blue' : 'chip-yellow'}`}>
              {t(`status_${seller.status}` as 'status_pending')}
            </span>
          </div>
          <Link
            href={{ pathname: '/sellers/profile', query: { return: '/sellers/me' } }}
            className={me.editLink}
          >
            {t('editProfile')}
          </Link>
        </section>

        <section className={me.offers}>
          <h2 className={me.offersTitle}>{t('offersTitle')}</h2>
          {offers.length === 0 ? (
            <div className={`card ${me.empty}`}>
              <p className={styles.lead}>{t('noOffers')}</p>
              <Link href="/requests" className="btn btn-yellow">
                {t('browse')}
              </Link>
            </div>
          ) : (
            <ul className={me.list}>
              {offers.map((o) => (
                <li key={o.id} className={`card ${me.item}`}>
                  <div>
                    <Link href={`/requests/${o.requestId}`} className={me.itemTitle}>
                      {o.requestBrand} {o.requestModel}
                    </Link>
                    <div className={me.meta}>
                      {o.car}, {o.year} · ${formatNumber(locale, o.priceUsd)}
                    </div>
                  </div>
                  <div className={me.itemRight}>
                    <span className="chip chip-blue">
                      {t(`offerStatus_${o.status}` as 'offerStatus_sent')}
                    </span>
                    <Link href={`/requests/${o.requestId}/offer`} className={me.editLink}>
                      {t('edit')}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
