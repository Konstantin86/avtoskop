import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { routing } from '@/i18n/routing';
import '../globals.css';

const fixel = localFont({
  src: [
    { path: '../../fonts/FixelText-Regular.woff2', weight: '400' },
    { path: '../../fonts/FixelText-Medium.woff2', weight: '500' },
    { path: '../../fonts/FixelText-SemiBold.woff2', weight: '600' },
    { path: '../../fonts/FixelDisplay-Bold.woff2', weight: '700' },
  ],
  variable: '--font-fixel',
  display: 'swap',
});

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fixel.variable}>
      <body style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <NextIntlClientProvider>
          <Header />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
