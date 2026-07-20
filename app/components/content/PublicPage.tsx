/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- CMS links and media are data-driven. */
import type { PageRecord } from '../../lib/cms-types';
import { getSiteUrl } from '../../lib/seo';
import { ContentRenderer } from './ContentRenderer';

export function PublicPage({ page, preview = false }: { page: PageRecord; preview?: boolean }) {
  const pageUrl = `${getSiteUrl()}/pages/${page.slug}`;
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': page.schemaType || 'WebPage',
    name: page.title,
    description: page.excerpt,
    url: pageUrl,
    datePublished: page.publishedAt ?? page.createdAt,
    dateModified: page.updatedAt,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'PC Checker', item: getSiteUrl() },
      { '@type': 'ListItem', position: 2, name: page.title, item: pageUrl },
    ],
  };

  return (
    <main className="public-theme min-h-screen px-4 py-10 text-slate-100 sm:px-6">
      <article className={`mx-auto ${page.pageTemplate === 'landing-page' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {preview ? <p className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-200">Private draft preview</p> : null}
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><a href="/">PC Checker</a><span className="mx-2">/</span>{page.title}</nav>
        <header className="mt-6">
          <h1 className="text-balance text-4xl font-black sm:text-6xl">{page.title}</h1>
          {page.excerpt ? <p className="mt-5 text-xl leading-8 text-slate-300">{page.excerpt}</p> : null}
        </header>
        {page.featuredImage ? <img alt="" className="mt-8 w-full rounded-3xl object-cover" src={page.featuredImage} /> : null}
        <div className="mt-10"><ContentRenderer body={page.body} /></div>
      </article>
      <script dangerouslySetInnerHTML={{ __html: safeJson(pageSchema) }} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbSchema) }} type="application/ld+json" />
    </main>
  );
}

function safeJson(value: object) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
