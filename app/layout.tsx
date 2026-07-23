import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdsenseScript } from './components/ads/AdsenseScript';
import { AdConfigurationProvider } from './components/ads/AdConfigurationProvider';
import { FooterAd } from './components/ads/AdPlacements';
import { SiteFooter } from './components/SiteFooter';
import { getPublicAdConfiguration } from './lib/ad-data';
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
  const adConfiguration = await getPublicAdConfiguration();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AdConfigurationProvider initialConfiguration={adConfiguration}>
          {children}
          <FooterAd className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" />
          <SiteFooter />
          <script dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'CanMyPCRunGTA6', url: getSiteUrl() }).replace(/</g, '\\u003c') }} type="application/ld+json" />
          <AdsenseScript />
        </AdConfigurationProvider>
      </body>
    </html>
  );
}
