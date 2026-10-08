import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { getSellerPage } from '@/server/sellerPage';
import forms from '../../sellers/forms.module.css';
import styles from './seller.module.css';

export const dynamic = 'force-dynamic';

// Reached from a rating on an offer; not meant for search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function SellerPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sellerPage');
  const p = await getTranslations('profile');
  const data = await getSellerPage(id);
  if (!data) {
    return (
      <div className={`container ${forms.page}`}>
        <div className={forms.wide}>
          <h1 className={forms.title}>{t('notFound')}</h1>
        </div>
      </div>
    );
  }
  const { seller, reviews } = data;
  const regions = (await getMessages()).regions as Record<string, string>;
  const date = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', opts);
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <div className={`container ${forms.page}`}>
      <div className={forms.wide}>
        <div className={`card ${styles.head}`}>
          <div className={styles.top}>
            <h1 className={styles.name}>{seller.name}</h1>
            <span className={`chip ${seller.status === 'verified' ? 'chip-blue' : 'chip-yellow'}`}>
              {t(seller.status === 'verified' ? 'verified' : 'new')}
            </span>
          </div>
          <div className={styles.meta}>
            {p(`type_${seller.type}` as 'type_importer')} · {regions[seller.region]}
            {seller.countries.length > 0 &&
              ` · ${seller.countries.map((c) => p(`country_${c}` as 'country_us')).join(', ')}`}
          </div>
          <div className={styles.meta}>
            {t('since', {
              date: date(seller.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }),
            })}
          </div>
          {seller.about && <p className={styles.about}>{seller.about}</p>}
          <div className={styles.rating}>
            {average === null
              ? t('noReviews')
              : `★ ${average.toFixed(1)} · ${t('reviews', { count: reviews.length })}`}
          </div>
        </div>
        {reviews.length > 0 && (
          <section className={styles.reviews}>
            <h2 className={styles.reviewsTitle}>{t('reviewsTitle')}</h2>
            <ul className={styles.list}>
              {reviews.map((r) => (
                <li key={r.createdAt.toISOString()} className={`card ${styles.review}`}>
                  <div className={styles.reviewTop}>
                    <span className={styles.stars}>
                      {'★'.repeat(r.rating)}
                      <span className={styles.starsOff}>{'★'.repeat(5 - r.rating)}</span>
                    </span>
                    <span className={styles.meta}>
                      {date(r.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && <p className={styles.comment}>{r.comment}</p>}
                </li>
              ))}
            </ul>
            <p className={styles.note}>{t('reviewsNote')}</p>
          </section>
        )}
      </div>
    </div>
  );
}
