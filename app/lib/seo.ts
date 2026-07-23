import type { Metadata } from 'next';
import type { ArticleRecord, PageRecord } from './cms-types';

const PRODUCTION_SITE_URL = 'https://canmypcrungta6.com';

export function getSiteUrl() {
  const configuredUrl = process.env.SITE_URL?.trim();
  const fallbackUrl = process.env.NODE_ENV === 'production'
    ? PRODUCTION_SITE_URL
    : 'http://localhost:3000';

  return (configuredUrl || fallbackUrl).replace(/\/$/, '');
}

export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: 'website', url: path },
    twitter: { card: 'summary', title, description },
  };
}

export function contentMetadata(content: ArticleRecord | PageRecord, path: string): Metadata {
  const title = content.seoTitle || content.title;
  const description = content.metaDescription || content.excerpt;
  const canonical = content.canonicalUrl || `${getSiteUrl()}${path}`;
  const ogImage = content.openGraphImage || content.featuredImage;
  const twitterImage = content.twitterImage || ogImage;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: content.noindex ? false : content.robotsIndex, follow: content.robotsFollow },
    openGraph: { title: content.openGraphTitle || title, description: content.openGraphDescription || description, url: canonical, type: path.startsWith('/articles/') ? 'article' : 'website', images: ogImage ? [ogImage] : undefined },
    twitter: { card: twitterImage ? 'summary_large_image' : 'summary', title: content.twitterTitle || title, description: content.twitterDescription || description, images: twitterImage ? [twitterImage] : undefined },
  };
}
