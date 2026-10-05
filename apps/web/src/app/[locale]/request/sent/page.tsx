import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { hashSecret, localePath } from '@avtoskop/core';
import { brands, buyerRequests } from '@avtoskop/db';
import { CopyLink } from '@/components/CopyLink';
import { CheckIcon } from '@/components/icons';
import { TelegramConfirm } from '@/components/TelegramConfirm';
import { Link } from '@/i18n/navigation';
import { db } from '@/server/db';
import { botStartLink } from '@/server/telegram';
import styles from './sent.module.css';

export const dynamic = 'force-dynamic';

// The URL may hold the buyer's private key.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; key?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sent');
  const f = await getTranslations('fields');
  const messages = await getMessages();
  const { id, key } = await searchParams;

  const [req] =
    id && UUID.test(id)
      ? await db
          .select({
            brand: brands.name,
            model: buyerRequests.model,
            yearFrom: buyerRequests.yearFrom,
            yearTo: buyerRequests.yearTo,
            budgetUsd: buyerRequests.budgetUsd,
            fuel: buyerRequests.fuel,
            gearbox: buyerRequests.gearbox,
            wishes: buyerRequests.wishes,
            region: buyerRequests.region,
            accessHash: buyerRequests.accessHash,
            phoneVerified: buyerRequests.phoneVerified,
          })
          .from(buyerRequests)
          .innerJoin(brands, eq(buyerRequests.brandId, brands.id))
          .where(eq(buyerRequests.id, id))
      : [];

  if (!req) {
    return (
      <div className={`container ${styles.page}`}>
        <p>{t('notFound')}</p>
      </div>
    );
  }

  const usd = new Intl.NumberFormat(locale === 'uk' ? 'uk-UA' : 'en-US');
  const years = req.yearTo ? `${req.yearFrom}–${req.yearTo}` : `${req.yearFrom}+`;
  const summary = [
    `${req.brand} ${req.model}`,
    years,
    req.fuel !== 'any' ? f(`fuel_${req.fuel}` as 'fuel_any').toLowerCase() : null,
    req.gearbox !== 'any' ? f(`gearbox_${req.gearbox}` as 'gearbox_any').toLowerCase() : null,
    `≤ $${usd.format(req.budgetUsd)}`,
    (messages.regions as Record<string, string>)[req.region],
    ...req.wishes.map((w) => lowerFirst(f(`wish_${w}` as 'wish_awd'))),
  ]
    .filter(Boolean)
    .join(' · ');

  const ownsLink = Boolean(key && req.accessHash && hashSecret(key) === req.accessHash);

  const confirmed = req.phoneVerified;
  const steps = [
    { state: 'done', title: t('step1'), text: null },
    { state: confirmed ? 'done' : 'now', title: t('step2'), text: t('step2Text') },
    { state: confirmed ? 'now' : 'next', title: t('step3'), text: t('step3Text') },
    { state: 'next', title: t('step4'), text: t('step4Text') },
  ] as const;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.badge}>
            <CheckIcon size={28} />
          </span>
          <h1 className={styles.title}>{confirmed ? t('title') : t('titlePending')}</h1>
          <p className={styles.summary}>{summary}</p>
        </div>

        <TelegramConfirm
          href={botStartLink(`req_${id}`)}
          confirmed={confirmed}
          title={confirmed ? t('telegramDoneTitle') : t('telegramTitle')}
          text={confirmed ? t('telegramDoneText') : t('telegramText')}
          button={t('telegramButton')}
        />

        <ol className={`card ${styles.timeline}`}>
          {steps.map((s) => (
            <li key={s.title} className={styles.step}>
              <span className={`${styles.dot} ${styles[s.state]}`}>
                {s.state === 'done' && <CheckIcon size={14} />}
              </span>
              <div>
                <div className={styles.stepTitle}>{s.title}</div>
                {s.text && <div className={styles.stepText}>{s.text}</div>}
              </div>
            </li>
          ))}
        </ol>

        {ownsLink && (
          <div className={`card ${styles.link}`}>
            <div>
              <div className={styles.stepTitle}>{t('linkTitle')}</div>
              <div className={styles.stepText}>{t('linkText')}</div>
            </div>
            <CopyLink
              path={localePath(locale, `/my/${key}`)}
              copyLabel={t('copy')}
              copiedLabel={t('copied')}
            />
            <Link href={`/my/${key}`} className="btn btn-yellow">
              {t('openOffers')}
            </Link>
          </div>
        )}

        <Link href="/" className="btn btn-secondary btn-lg">
          {t('browse')}
        </Link>
      </div>
    </div>
  );
}
