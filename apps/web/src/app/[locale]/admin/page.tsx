import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ConfirmButton } from '@/components/ConfirmButton';
import { formatNumber, timeAgo } from '@/components/requestFormat';
import { getAdmin, listOpenReports, listSellersForAdmin, listVinFlags } from '@/server/admin';
import { funnel, topViews } from '@/server/stats';
import { resolveReportAction, setSellerStatusAction } from './actions';
import forms from '../sellers/forms.module.css';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string }> };

const STATUS_CHIP: Record<string, string> = {
  pending: 'chip-yellow',
  verified: 'chip-blue',
  banned: styles.banned ?? '',
};

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Non-admins get a plain 404, so the page's existence isn't advertised.
  if (!(await getAdmin())) notFound();

  const t = await getTranslations('admin');
  const p = await getTranslations('profile');
  const m = await getTranslations('my');
  const regions = (await getMessages()).regions as Record<string, string>;
  const [sellerList, reportList, vinFlags] = await Promise.all([
    listSellersForAdmin(),
    listOpenReports(),
    listVinFlags(),
  ]);
  const [week, month, sources, pages] = await Promise.all([
    funnel(7),
    funnel(30),
    topViews(30, 'source'),
    topViews(30, 'page'),
  ]);
  const metrics = ['views', 'requests', 'confirmed', 'offersSent', 'shared', 'newSellers'] as const;

  const statusButton = (sellerId: string, status: string, label: string, confirm?: string) => (
    <form action={setSellerStatusAction}>
      <input type="hidden" name="sellerId" value={sellerId} />
      <input type="hidden" name="status" value={status} />
      {confirm ? (
        <ConfirmButton confirm={confirm} className="btn btn-secondary btn-sm">
          {label}
        </ConfirmButton>
      ) : (
        <button type="submit" className="btn btn-secondary btn-sm">
          {label}
        </button>
      )}
    </form>
  );

  return (
    <div className={`container ${forms.page}`}>
      <div className={styles.wide}>
        <h1 className={forms.title}>{t('title')}</h1>

        <section className={styles.section}>
          <h2 className={styles.heading}>{t('statsTitle')}</h2>
          <div className={`card ${styles.item}`}>
            <table className={styles.stats}>
              <thead>
                <tr>
                  <th />
                  <th>{t('statsWeek')}</th>
                  <th>{t('statsMonth')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m}>
                    <td>{t(`stat_${m}`)}</td>
                    <td>{formatNumber(locale, week[m])}</td>
                    <td>{formatNumber(locale, month[m])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.statsLists}>
            {(
              [
                ['statsSources', sources],
                ['statsPages', pages],
              ] as const
            ).map(([title, rows]) => (
              <div key={title} className={`card ${styles.item}`}>
                <strong>{t(title)}</strong>
                {rows.length === 0 && <span className={styles.muted}>{t('statsEmpty')}</span>}
                {rows.map((r) => (
                  <div key={r.name} className={styles.row}>
                    <span>{r.name}</span>
                    <span className={styles.muted}>{formatNumber(locale, r.views)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className={styles.muted}>{t('statsNote')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>{t('reportsTitle', { count: reportList.length })}</h2>
          {reportList.length === 0 && <p className={styles.muted}>{t('noReports')}</p>}
          {reportList.map((r) => (
            <article key={r.id} className={`card ${styles.item}`}>
              <div className={styles.row}>
                <strong>{m(`reason_${r.reason}` as 'reason_deposit')}</strong>
                <span className={styles.muted}>{timeAgo(locale, r.createdAt)}</span>
              </div>
              {r.comment && <p className={styles.quote}>{r.comment}</p>}
              <div className={styles.muted}>
                {t('reportOn', {
                  seller: r.sellerName,
                  request: `${r.requestBrand} ${r.requestModel}`,
                })}{' '}
                · {r.car}, ${formatNumber(locale, r.priceUsd)}
              </div>
              {r.description && <p className={styles.small}>{r.description}</p>}
              {r.sellerReply ? (
                <p className={styles.quote}>{t('sellerReply', { reply: r.sellerReply })}</p>
              ) : (
                <p className={styles.muted}>{t('noSellerReply')}</p>
              )}
              <div className={styles.actions}>
                {statusButton(r.sellerId, 'banned', t('ban'), t('banConfirm'))}
                <form action={resolveReportAction}>
                  <input type="hidden" name="reportId" value={r.id} />
                  <button type="submit" className="btn btn-secondary btn-sm">
                    {t('resolve')}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>{t('vinTitle', { count: vinFlags.length })}</h2>
          {vinFlags.length === 0 && <p className={styles.muted}>{t('noVinFlags')}</p>}
          {vinFlags.map((r) => (
            <article key={r.offerId} className={`card ${styles.item}`}>
              <div className={styles.row}>
                <div className={styles.actions}>
                  {r.flags.map((flag) => (
                    <span
                      key={flag}
                      className={`chip ${flag === 'wanted' ? (styles.banned ?? '') : 'chip-yellow'}`}
                    >
                      {t(`vinFlag_${flag}`)}
                    </span>
                  ))}
                </div>
                <span className={styles.muted}>{timeAgo(locale, r.updatedAt)}</span>
              </div>
              <div>
                <code>{r.vin}</code>
                {r.vinDecoded && (
                  <span className={styles.muted}>
                    {' '}
                    ·{' '}
                    {[r.vinDecoded.make, r.vinDecoded.model, r.vinDecoded.year]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                )}
              </div>
              <div className={styles.muted}>
                {t('vinOffer', {
                  seller: r.sellerName,
                  request: `${r.requestBrand} ${r.requestModel}`,
                  car: `${r.car}, ${r.year}`,
                })}
              </div>
              {r.sellerStatus !== 'banned' && (
                <div className={styles.actions}>
                  {statusButton(r.sellerId, 'banned', t('ban'), t('banConfirm'))}
                </div>
              )}
            </article>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>{t('sellersTitle', { count: sellerList.length })}</h2>
          {sellerList.map((s) => (
            <article key={s.id} className={`card ${styles.item}`}>
              <div className={styles.row}>
                <div>
                  <strong>{s.name}</strong>
                  <div className={styles.muted}>
                    {p(`type_${s.type}` as 'type_importer')} · {regions[s.region]} ·{' '}
                    {s.telegramUsername ? `@${s.telegramUsername}` : t('noUsername')} ·{' '}
                    {timeAgo(locale, s.createdAt)}
                  </div>
                </div>
                <span className={`chip ${STATUS_CHIP[s.status] ?? ''}`}>
                  {t(`status_${s.status}` as 'status_pending')}
                </span>
              </div>
              {s.about && <p className={styles.small}>{s.about}</p>}
              {s.verifyEvidence && (
                <p className={styles.quote}>
                  {t('verifyEvidence', { evidence: s.verifyEvidence })}
                </p>
              )}
              <div className={styles.row}>
                <span className={styles.muted}>
                  {t('counts', { offers: s.offerCount, reports: s.reportCount })}
                </span>
                <div className={styles.actions}>
                  {s.status !== 'verified' && statusButton(s.id, 'verified', t('verify'))}
                  {s.status !== 'pending' && statusButton(s.id, 'pending', t('toPending'))}
                  {s.status !== 'banned' && statusButton(s.id, 'banned', t('ban'), t('banConfirm'))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
