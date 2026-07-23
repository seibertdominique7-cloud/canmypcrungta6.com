import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PublicPage } from '../components/content/PublicPage';
import { isRequiredPageKey } from '../data/required-pages';
import { findRedirect, getPublishedRequiredPage } from '../lib/cms-data';
import { contentMetadata } from '../lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ path: string[] }> }): Promise<Metadata> {
  const path = (await params).path;
  if (path.length !== 1 || !isRequiredPageKey(path[0])) return { title: 'Page not found', robots: { index: false } };
  const page = await getPublishedRequiredPage(path[0]);
  return page ? contentMetadata(page, `/${path[0]}`) : { title: 'Page not found', robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const source = `/${parts.join('/')}`;
  if (parts.length === 1 && isRequiredPageKey(parts[0])) {
    const page = await getPublishedRequiredPage(parts[0]);
    if (page) return <PublicPage page={page} path={source} />;
  }
  const route = await findRedirect(source);
  if (route) redirect(route.destinationPath);
  notFound();
}
