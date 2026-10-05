import { getTranslations } from 'next-intl/server';
import styles from './LegalPage.module.css';

interface Section {
  title: string;
  body: string;
}

const UPDATED = new Date('2026-10-05');

// Operator details come from the environment, so the text needs no edit at launch.
function fill(text: string): string {
  return text
    .replace(/\{operator\}/g, process.env['SITE_OPERATOR'] || '[SITE_OPERATOR]')
    .replace(/\{email\}/g, process.env['CONTACT_EMAIL'] || '[CONTACT_EMAIL]');
}

export async function LegalPage({ doc, locale }: { doc: 'terms' | 'privacy'; locale: string }) {
  const t = await getTranslations('legal');
  const sections = t.raw(`${doc}.sections`) as Section[];
  const date = UPDATED.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={`container ${styles.page}`}>
      <article className={styles.doc}>
        <h1>{t(`${doc}.title`)}</h1>
        <p className={styles.meta}>{t('updated', { date })}</p>
        {sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{fill(s.body)}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
