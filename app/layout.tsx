import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from 'next/server';
import { AdsenseScript } from './components/ads/AdsenseScript';
import { AdConfigurationProvider } from './components/ads/AdConfigurationProvider';
import { FooterAd } from './components/ads/AdPlacements';
import { GoogleAnalytics } from './components/analytics/GoogleAnalytics';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { PublicChrome } from './components/PublicChrome';
import { StoreAnnouncement } from './components/merch/StoreAnnouncement';
import { getPublicAdConfiguration } from './lib/ad-data';
import { isFourthwallConfigured } from './lib/fourthwall';
import { getMerchStoreSettings } from './lib/merch-data';
import { isPublicMerchStore } from './lib/merch-validation';
import { getSiteUrl } from './lib/seo';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: 'CanMyPCRunGTA6',
  manifest: '/site.webmanifest',
  title: "Can My PC Run GTA VI? | PC Requirements Checker",
  description: "Check if your gaming PC meets the current requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.",
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Can My PC Run GTA VI? | PC Requirements Checker',
    description: 'Check whether your gaming PC meets the estimated GTA VI PC requirements.',
    type: 'website',
    url: '/',
    siteName: 'CanMyPCRunGTA6',
  },
  twitter: {
    card: 'summary',
    title: 'Can My PC Run GTA VI? | PC Requirements Checker',
    description: 'Check whether your gaming PC meets the estimated GTA VI PC requirements.',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Navigation, ads, and merch settings are database-managed content. Resolve
  // them per request instead of requiring the production database while Next
  // inspects and prerenders route modules during a local build.
  await connection();

  const [adConfiguration, merchSettings] = await Promise.all([
    getPublicAdConfiguration(),
    getMerchStoreSettings(),
  ]);
  const publicMerchStore = isPublicMerchStore(merchSettings);
  const fourthwallEnabled = isFourthwallConfigured();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? '';

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AdConfigurationProvider initialConfiguration={adConfiguration}>
          <PublicChrome>
            {publicMerchStore &&
            merchSettings.announcementEnabled &&
            merchSettings.announcementText ? (
              <StoreAnnouncement text={merchSettings.announcementText} />
            ) : null}
            <SiteHeader
              fourthwallEnabled={fourthwallEnabled}
              merchSettings={merchSettings}
            />
          </PublicChrome>
          {children}
          <FooterAd className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" />
          <SiteFooter
            fourthwallEnabled={fourthwallEnabled}
            merchSettings={merchSettings}
          />
          <script dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'CanMyPCRunGTA6', url: getSiteUrl() }).replace(/</g, '\\u003c') }} type="application/ld+json" />
          <AdsenseScript />
        </AdConfigurationProvider>
        {gaMeasurementId ? (
          <GoogleAnalytics measurementId={gaMeasurementId} />
        ) : null}
      </body>
    </html>
  );
}
