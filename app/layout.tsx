import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from './components/SiteFooter';
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
  title: "Can My PC Run GTA VI? | PC Requirements Checker",
  description: "Check if your gaming PC meets the current requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SiteFooter />
        <script dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'CanMyPCRunGTA6', url: process.env.SITE_URL || 'http://localhost:3000' }).replace(/</g, '\\u003c') }} type="application/ld+json" />
      </body>
    </html>
  );
}
