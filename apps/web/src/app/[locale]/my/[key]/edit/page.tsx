import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { getBrandOptions } from '@/server/brands';
import { getRequestByKey } from '@/server/buyer';
import { RequestForm } from '../../../request/RequestForm';
import { SellerTypesAside } from '../../../request/SellerTypesAside';
import styles from '../../../request/request.module.css';

export const dynamic = 'force-dynamic';

// The URL holds the buyer's secret: keep it out of search engines and referrers.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

type Props = { params: Promise<{ locale: string; key: string }> };

export default async function EditRequestPage({ params }: Props) {
  const { locale, key } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('request');
  const request = await getRequestByKey(key);
  if (!request || request.status === 'closed') {
    redirect({ href: `/my/${key}`, locale });
    return null;
  }

  const defaults: Record<string, string> = {
    brandId: String(request.brandId),
    model: request.model,
    yearFrom: String(request.yearFrom),
    yearTo: request.yearTo ? String(request.yearTo) : '',
    budgetUsd: String(request.budgetUsd),
    region: request.region,
    importOk: String(request.importOk),
    fuels: request.fuels.join(','),
    gearbox: request.gearbox,
    mileageMaxKm: request.mileageMaxKm ? String(request.mileageMaxKm) : '',
    wishes: request.wishes.join(','),
    notes: request.notes,
    sellerTypes: request.sellerTypes.join(','),
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.head}>
        <Link href={`/my/${key}`} className={styles.back}>
          {t('editBack')}
        </Link>
        <h1 className={styles.title}>{t('editTitle')}</h1>
        <p className={styles.lead}>{t('editLead')}</p>
      </div>
      <div className={styles.layout}>
        <RequestForm
          locale={locale}
          brands={await getBrandOptions()}
          regionNames={(await getMessages()).regions as Record<string, string>}
          defaults={defaults}
          edit={{ key, car: `${request.brand} ${request.model}` }}
        />
        <SellerTypesAside defaults={defaults} />
      </div>
    </div>
  );
}
