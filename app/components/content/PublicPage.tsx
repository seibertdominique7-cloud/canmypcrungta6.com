/* eslint-disable @next/next/no-img-element -- CMS media can use administrator-managed external URLs. */
import Link from 'next/link';

import type { PageRecord } from '../../lib/cms-types';
import { getPagePublicPath } from '../../lib/cms-types';
import { getSiteUrl } from '../../lib/seo';
import { ContactForm } from './ContactForm';
import { ContentRenderer } from './ContentRenderer';
import { FaqList } from './FaqList';

export function PublicPage({ page, preview = false, path }: { page: PageRecord; preview?: boolean; path?: string }) {
  const publicPath = path ?? getPagePublicPath(page);
  const pageUrl = `${getSiteUrl()}${publicPath}`;
  const faqEntries = page.faqEntries.filter((entry) => entry.enabled);
  const pageSchema = page.pageTemplate === 'faq'
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        name: page.title,
        description: page.excerpt,
        url: pageUrl,
        dateModified: page.updatedAt,
        mainEntity: faqEntries.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      }
    : {
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
  const widthClass = page.pageTemplate === 'landing-page' ? 'max-w-6xl' : 'max-w-4xl';

  return (
    <main className="public-theme min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className={`mx-auto ${widthClass}`}>
        <article className="theme-glass-strong rounded-3xl p-5 sm:p-8 lg:p-10">
          {preview ? <p className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm font-bold text-amber-200">Private draft preview</p> : null}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500"><Link className="hover:text-violet-300" href="/">PC Checker</Link><span className="mx-2" aria-hidden="true">/</span>{page.title}</nav>
          <header className="mt-6 border-b border-white/10 pb-8">
            <h1 className="text-balance text-4xl font-black leading-tight [overflow-wrap:anywhere] sm:text-6xl">{page.title}</h1>
            {page.excerpt ? <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">{page.excerpt}</p> : null}
            <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Published {formatDate(page.publishedAt ?? page.createdAt)}</span><span>Last updated {formatDate(page.updatedAt)}</span></p>
          </header>
          {page.featuredImage ? <img alt={`${page.title} featured image`} className="mt-8 max-h-[600px] w-full rounded-3xl object-contain" referrerPolicy="no-referrer" src={page.featuredImage} /> : null}
          <div className="mt-9"><ContentRenderer body={page.body} imageAltFallback={page.title} /></div>
          {page.pageTemplate === 'faq' ? <FaqList entries={faqEntries} /> : null}
          {page.pageTemplate === 'contact' ? <ContactForm /> : null}
        </article>
      </div>
      <script dangerouslySetInnerHTML={{ __html: safeJson(pageSchema) }} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbSchema) }} type="application/ld+json" />
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(value));
}

function safeJson(value: object) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
