import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ViewTransition, type ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { NavProgress } from '@/components/NavProgress';
import { PageView } from '@/components/PageView';
import { parseTheme, THEME_COOKIE } from '@/components/theme';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/server/telegram';
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
  // Absolute links for preview images; shared posts need the public address.
  return {
    metadataBase: new URL(siteUrl()),
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName: locale === 'uk' ? 'Автоскоп' : 'Avtoskop',
      locale: locale === 'uk' ? 'uk_UA' : 'en_US',
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang={locale}
      className={fixel.variable}
      {...(theme !== 'system' && { 'data-theme': theme })}
    >
      <body style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <NextIntlClientProvider>
          <NavProgress />
          <Header />
          <main style={{ flex: 1 }}>
            {/* Every page change cross-fades the content; the header stays put. */}
            <ViewTransition default="page">{children}</ViewTransition>
          </main>
          <Footer />
          <PageView />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
