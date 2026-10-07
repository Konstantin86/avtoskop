import { getTranslations } from 'next-intl/server';
import { OG_SIZE, ogCard } from '@/server/og';

export const alt = 'Автоскоп';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'og' });
  return ogCard({
    brand: t('brand'),
    eyebrow: t('sellersEyebrow'),
    title: t('sellersTitle'),
    lines: [t('sellersLine')],
    footer: t('domain'),
  });
}
