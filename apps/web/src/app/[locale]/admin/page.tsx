import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { ConfirmButton } from '@/components/ConfirmButton';
import { formatNumber, timeAgo } from '@/components/requestFormat';
import { getAdmin, listOpenReports, listSellersForAdmin } from '@/server/admin';
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
  const [sellerList, reportList] = await Promise.all([listSellersForAdmin(), listOpenReports()]);

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
