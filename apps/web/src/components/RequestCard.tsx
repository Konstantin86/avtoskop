import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { PublicRequest } from '@/server/requests';
import { CarIcon, FlagEU, FlagUS } from './icons';
import { formatNumber, fuelsLabel, timeAgo, yearsLabel } from './requestFormat';
import styles from './RequestCard.module.css';

export async function RequestCard({ request: r }: { request: PublicRequest }) {
  const t = await getTranslations('board');
  const f = await getTranslations('fields');
  const locale = await getLocale();
  const regions = (await getMessages()).regions as Record<string, string>;

  const specs = [
    fuelsLabel(r.fuels, (x) => f(`fuel_${x}` as 'fuel_hybrid')),
    r.gearbox !== 'any' ? f(`gearbox_${r.gearbox}` as 'gearbox_any') : null,
    r.mileageMaxKm
      ? `≤ ${formatNumber(locale, r.mileageMaxKm)} ${locale === 'uk' ? 'км' : 'km'}`
      : null,
  ].filter(Boolean);

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.when}>{timeAgo(locale, r.createdAt)}</span>
        <span className={styles.region}>{regions[r.region]}</span>
      </div>
      <div className={styles.titleRow}>
        <span className={styles.badge} aria-hidden="true">
          <CarIcon size={20} />
        </span>
        <h3 className={styles.title}>
          <Link href={`/requests/${r.id}`}>
            {r.brand} {r.model}
          </Link>
        </h3>
      </div>
      <div className={styles.meta}>
        <span>{yearsLabel(r)}</span>
        {specs.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <div className={styles.budget}>
        {t('budget', { amount: formatNumber(locale, r.budgetUsd) })}
      </div>
      {r.wishes.length > 0 && (
        <div className={styles.wishes}>
          {r.wishes.map((w) => (
            <span key={w} className="chip chip-blue">
              {f(`wish_${w}` as 'wish_awd')}
            </span>
          ))}
        </div>
      )}
      {r.notes && <p className={styles.notes}>{r.notes}</p>}
      {r.sellerTypes.length > 0 && (
        <p className={styles.onlyFrom}>
          {t('repliesOnly', {
            types: r.sellerTypes.map((type) => t(`typeOf_${type}` as 'typeOf_owner')).join(', '),
          })}
        </p>
      )}
      <div className={styles.footer}>
        <span className={styles.import}>
          {r.importOk ? (
            <>
              <FlagUS />
              <FlagEU />
              {t('importOk')}
            </>
          ) : (
            t('onlyUkraine')
          )}
        </span>
        <Link href={`/requests/${r.id}`} className="btn btn-blue btn-sm">
          {t('offer')}
        </Link>
      </div>
    </article>
  );
}
