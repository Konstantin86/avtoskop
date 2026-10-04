import { getTranslations } from 'next-intl/server';

export async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer style={{ borderTop: '1px solid var(--line)', marginTop: 'auto' }}>
      <div
        className="container"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 12,
          padding: '28px var(--page-x)',
          fontSize: 14,
          color: 'var(--muted)',
        }}
      >
        <span>{t('copyright', { year: new Date().getFullYear() })}</span>
        <span>{t('data')}</span>
      </div>
    </footer>
  );
}
