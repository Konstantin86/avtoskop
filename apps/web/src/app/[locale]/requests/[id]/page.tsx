import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { FlagEU, FlagUS } from '@/components/icons';
import { formatNumber, timeAgo, yearsLabel } from '@/components/requestFormat';
import { Link } from '@/i18n/navigation';
import { getPublicRequest } from '@/server/requests';
import styles from './detail.module.css';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const r = await getPublicRequest(id);
  if (!r) return {};
  const t = await getTranslations({ locale, namespace: 'board' });
  const car = `${r.brand} ${r.model} ${yearsLabel(r)}, ${t('budget', { amount: formatNumber(locale, r.budgetUsd) })}`;
  const title = t('shareTitle', { car });
  return { title, openGraph: { title, description: t('lead') } };
}

export default async function RequestDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('board');
  const f = await getTranslations('fields');
  const regions = (await getMessages()).regions as Record<string, string>;
  const r = await getPublicRequest(id);

  if (!r) {
    return (
      <div className={`container ${styles.page}`}>
        <Link href="/requests" className={styles.back}>
          {t('back')}
        </Link>
        <p>{t('notFound')}</p>
      </div>
    );
  }

  const rows: Array<[string, string]> = [
    [t('years'), yearsLabel(r)],
    [f('fuel'), f(`fuel_${r.fuel}` as 'fuel_any')],
    [f('gearbox'), f(`gearbox_${r.gearbox}` as 'gearbox_any')],
    ...(r.mileageMaxKm
      ? ([[f('mileageMax'), formatNumber(locale, r.mileageMaxKm)]] as Array<[string, string]>)
      : []),
    [f('region'), regions[r.region] ?? r.region],
    [f('import'), r.importOk ? t('importOk') : t('onlyUkraine')],
  ];

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/requests" className={styles.back}>
        {t('back')}
      </Link>
      <div className={styles.layout}>
        <article className={`card ${styles.main}`}>
          <span className={styles.posted}>
            {t('posted', { when: timeAgo(locale, r.createdAt) })}
          </span>
          <h1 className={styles.title}>
            {r.brand} {r.model}
          </h1>
          <div className={styles.budget}>
            {t('budget', { amount: formatNumber(locale, r.budgetUsd) })}
          </div>
          <dl className={styles.specs}>
            {rows.map(([k, v]) => (
              <div key={k} className={styles.spec}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {r.wishes.length > 0 && (
            <div className={styles.wishes}>
              {r.wishes.map((w) => (
                <span key={w} className="chip chip-blue">
                  {f(`wish_${w}` as 'wish_awd')}
                </span>
              ))}
            </div>
          )}
          {r.notes && (
            <div className={styles.notes}>
              <h2 className={styles.notesTitle}>{t('notes')}</h2>
              <p>{r.notes}</p>
            </div>
          )}
        </article>

        <aside className={styles.offer}>
          {r.importOk && (
            <span className={styles.flags}>
              <FlagUS />
              <FlagEU />
            </span>
          )}
          <h2 className={styles.offerTitle}>{t('offerTitle')}</h2>
          <p className={styles.offerText}>{t('offerText')}</p>
          <Link href="/sellers" className="btn btn-yellow btn-block">
            {t('offerCta')}
          </Link>
        </aside>
      </div>
    </div>
  );
}
