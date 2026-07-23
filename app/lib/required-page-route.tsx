import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicPage } from '../components/content/PublicPage';
import type { RequiredPageKey } from '../data/required-pages';
import { getPublishedRequiredPage } from './cms-data';
import { contentMetadata } from './seo';

export async function requiredPageMetadata(key: RequiredPageKey): Promise<Metadata> {
  const page = await getPublishedRequiredPage(key);
  return page
    ? contentMetadata(page, `/${key}`)
    : { title: 'Page not found', robots: { index: false, follow: false } };
}

export async function RequiredPageRoute({ pageKey }: { pageKey: RequiredPageKey }) {
  const page = await getPublishedRequiredPage(pageKey);
  if (!page) notFound();
  return <PublicPage page={page} path={`/${pageKey}`} />;
}
