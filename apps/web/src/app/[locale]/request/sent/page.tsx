import { eq } from 'drizzle-orm';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { brands, buyerRequests } from '@avtoskop/db';
import { CheckIcon, TelegramIcon } from '@/components/icons';
import { Link } from '@/i18n/navigation';
import { db } from '@/server/db';
import styles from './sent.module.css';

export const dynamic = 'force-dynamic';

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('sent');
  const f = await getTranslations('fields');
  const messages = await getMessages();
  const { id } = await searchParams;

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

  const steps = [
    { state: 'done', title: t('step1'), text: null },
    { state: 'done', title: t('step2'), text: t('step2Text') },
    { state: 'now', title: t('step3'), text: t('step3Text') },
    { state: 'next', title: t('step4'), text: t('step4Text') },
  ] as const;

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.badge}>
            <CheckIcon size={28} />
          </span>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.summary}>{summary}</p>
        </div>

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

        <div className={styles.telegram}>
          <span className={styles.tgIcon}>
            <TelegramIcon />
          </span>
          <div className={styles.tgText}>
            <div className={styles.stepTitle}>{t('telegramTitle')}</div>
            <div className={styles.stepText}>{t('telegramText')}</div>
          </div>
          <span className="btn btn-blue btn-sm" aria-disabled="true">
            {t('telegramButton')}
          </span>
        </div>

        <Link href="/" className="btn btn-secondary btn-lg">
          {t('browse')}
        </Link>
      </div>
    </div>
  );
}
