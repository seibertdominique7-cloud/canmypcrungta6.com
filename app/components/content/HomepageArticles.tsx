/* eslint-disable @next/next/no-img-element -- CMS images may use administrator-approved HTTPS hosts at runtime. */

import type { ArticleRecord } from '../../lib/cms-types';
import { estimateReadingTime } from './ContentRenderer';
import Link from 'next/link';

export function HomepageArticles({ articles }: { articles: ArticleRecord[] }) {
  const featured = articles[0]?.featured ? articles[0] : null;
  const standardArticles = featured ? articles.slice(1) : articles;

  return (
    <section aria-labelledby="latest-articles-heading" className="mb-12 mt-10 w-full max-w-6xl px-4 sm:mb-16 sm:mt-14 sm:px-0">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">NEWS & ARTICLES</p>
        <h2 className="mt-3 text-balance text-3xl font-black text-white sm:text-4xl" id="latest-articles-heading">Latest GTA VI News &amp; Guides</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">Stay updated with GTA VI news, PC requirements, hardware recommendations, upgrade guides, and gaming deals.</p>
      </header>

      {!articles.length ? (
        <p className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-slate-400 backdrop-blur-xl">No articles have been published yet.</p>
      ) : (
        <>
          {featured ? <FeaturedArticleCard article={featured} /> : null}
          {standardArticles.length ? <div className={`mt-6 grid gap-6 ${featured ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>{standardArticles.map((article) => <ArticleCard article={article} key={article.id} />)}</div> : null}
        </>
      )}

      <div className="mt-8 flex justify-center"><Link className="rounded-xl border border-violet-400/30 bg-violet-500/15 px-5 py-3 text-sm font-black text-violet-100 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-500/25" href="/articles">View All Articles</Link></div>
    </section>
  );
}

function FeaturedArticleCard({ article }: { article: ArticleRecord }) {
  const category = primaryCategory(article);
  return (
    <article className="group mt-8 grid overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-white/[0.04] to-cyan-500/10 shadow-xl shadow-black/20 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300/40 hover:shadow-2xl hover:shadow-violet-950/30 lg:grid-cols-[1.25fr_1fr]">
      <a className="overflow-hidden bg-black/25" href={`/articles/${article.slug}`}><ArticleImage article={article} className="aspect-[16/9] h-full min-h-64 w-full object-cover transition duration-500 group-hover:scale-[1.035]" /></a>
      <div className="flex flex-col justify-center p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2"><CategoryPill name={category?.name ?? 'News & Guides'} slug={category?.slug} /><span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">Featured</span></div><h3 className="mt-4 text-balance text-2xl font-black text-white sm:text-3xl"><a href={`/articles/${article.slug}`}>{article.title}</a></h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300 sm:text-base">{article.excerpt}</p><ArticleMeta article={article} /><a className="mt-5 text-sm font-black text-violet-200 transition group-hover:text-white" href={`/articles/${article.slug}`}>Read Article →</a></div>
    </article>
  );
}

function ArticleCard({ article }: { article: ArticleRecord }) {
  const category = primaryCategory(article);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-lg shadow-black/10 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-400/30 hover:bg-gradient-to-br hover:from-violet-500/10 hover:to-cyan-500/5 hover:shadow-2xl hover:shadow-violet-950/25">
      <a className="overflow-hidden bg-black/25" href={`/articles/${article.slug}`}><ArticleImage article={article} className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-105" /></a>
      <div className="flex flex-1 flex-col p-5 sm:p-6"><CategoryPill name={category?.name ?? 'News & Guides'} slug={category?.slug} /><h3 className="mt-3 text-balance text-xl font-black text-white"><a href={`/articles/${article.slug}`}>{article.title}</a></h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{article.excerpt}</p><ArticleMeta article={article} /><a className="mt-4 text-sm font-black text-violet-200 transition group-hover:text-white" href={`/articles/${article.slug}`}>Read Article →</a></div>
    </article>
  );
}

function ArticleImage({ article, className }: { article: ArticleRecord; className: string }) { return article.featuredImage ? <img alt={`${article.title} featured image`} className={className} decoding="async" loading="lazy" referrerPolicy="no-referrer" src={article.featuredImage} /> : <div aria-hidden="true" className={`${className} bg-gradient-to-br from-violet-500/25 via-slate-950 to-cyan-500/15`} />; }
function CategoryPill({ name, slug }: { name: string; slug?: string }) { const className = 'w-fit rounded-full border border-violet-400/25 bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200'; return slug ? <a className={className} href={`/category/${slug}`}>{name}</a> : <span className={className}>{name}</span>; }
function ArticleMeta({ article }: { article: ArticleRecord }) { const date = article.publishedAt ?? article.createdAt; return <p className="mt-auto pt-5 text-xs text-slate-500"><time dateTime={date}>{formatDate(date)}</time><span aria-hidden="true" className="mx-2">•</span>{estimateReadingTime(article.body)} min read</p>; }
function primaryCategory(article: ArticleRecord) { return article.categories.find((item) => item.isPrimary) ?? article.categories[0]; }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)); }
