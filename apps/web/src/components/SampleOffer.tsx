import { getTranslations } from 'next-intl/server';
import styles from '@/app/[locale]/my/[key]/my.module.css';
import { formatNumber } from './requestFormat';
import { FlagUS } from './icons';
import home from './SampleOffer.module.css';

// A made-up offer drawn with the real offer card styles, so buyers see what they will get.
export async function SampleOffer({ locale }: { locale: string }) {
  const t = await getTranslations('home');
  const m = await getTranslations('my');
  const o = await getTranslations('offer');
  const p = await getTranslations('profile');
  const f = await getTranslations('fields');
  const regions = await getTranslations('regions');
  const today = new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB');

  return (
    <section className={home.section}>
      <div className={home.text}>
        <h2 className={home.title}>{t('sampleTitle')}</h2>
        <p className={home.lead}>{t('sampleLead')}</p>
      </div>
      <div className={`card ${styles.offer} ${home.card}`} aria-label={t('sampleBadge')}>
        <span className={`chip ${home.badge}`}>{t('sampleBadge')}</span>
        <div className={styles.offerTop}>
          <div>
            <div className={styles.car}>Toyota RAV4 Hybrid XLE, 2021</div>
            <div className={styles.facts}>
              <FlagUS />
              {formatNumber(locale, 48000)} {m('km')} · {o('availability_in_transit')},{' '}
              {m('eta', { weeks: 6 })} · {p('country_us')}
            </div>
          </div>
          <div className={styles.price}>
            ${formatNumber(locale, 25900)}
            <span>{m('turnkey')}</span>
          </div>
        </div>
        <div className={styles.vin}>
          <div>
            <span className={styles.vinLabel}>VIN</span> <code>JTMB•••••••••4821</code>
          </div>
          <div className={styles.vinGood}>✓ {m('vinNotWanted', { date: today })}</div>
          <div className={styles.vinGood}>✓ {m('vinMatches', { car: 'Toyota RAV4 2021' })}</div>
        </div>
        <div className={styles.features}>
          <span className={styles.match}>✓ {m('wishMatch', { matched: 2, total: 2 })}</span>
          <ul className={styles.featureList}>
            <li className="chip chip-blue">{f('wish_no_accidents')}</li>
            <li className="chip chip-blue">{f('wish_service_history')}</li>
            <li className="chip">{f('wish_awd')}</li>
          </ul>
        </div>
        <div className={styles.seller}>
          <div>
            <div className={styles.sellerName}>{t('sampleSeller')}</div>
            <div className={styles.facts}>
              {p('type_importer')} · {regions('kyiv-city')}
            </div>
          </div>
          <span className="chip chip-blue">{m('sellerVerified')}</span>
        </div>
        {/* Looks like the real buttons but does nothing: it's only an example. */}
        <div className={styles.actions} aria-hidden="true">
          <span className="btn btn-yellow">{m('share')}</span>
          <span className="btn btn-secondary">{m('decline')}</span>
        </div>
      </div>
    </section>
  );
}
