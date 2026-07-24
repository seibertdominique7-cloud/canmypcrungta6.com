import type {
  AiSeoArticleContext,
  AiSeoProductContext,
  GeneratedArticle,
} from './ai-seo-types';
import {
  affiliateProductHtml,
  escapeHtml,
  richTextBody,
} from './rich-text-shared';

export function buildGeneratedArticleBody(
  article: GeneratedArticle,
  products: AiSeoProductContext[],
  relatedArticles: AiSeoArticleContext[],
) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const relatedMap = new Map(relatedArticles.map((item) => [item.id, item]));
  const html: string[] = [];

  for (const paragraph of article.introduction) html.push(paragraphHtml(paragraph));

  html.push('<h2>Key Takeaways</h2>');
  html.push(listHtml(article.keyTakeaways));

  for (const section of article.sections) {
    html.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    html.push(...section.paragraphs.map(paragraphHtml));
    if (section.bullets.length) html.push(listHtml(section.bullets));
    for (const subsection of section.subsections) {
      html.push(`<h3>${escapeHtml(subsection.heading)}</h3>`);
      html.push(...subsection.paragraphs.map(paragraphHtml));
      if (subsection.bullets.length) html.push(listHtml(subsection.bullets));
    }
  }

  if (article.comparisonTable) {
    html.push(`<h2>${escapeHtml(article.comparisonTable.heading)}</h2>`);
    html.push(tableHtml(article.comparisonTable.headers, article.comparisonTable.rows));
  }

  const productRecommendations = article.productRecommendations.filter((item) =>
    productMap.has(item.productId),
  );
  if (productRecommendations.length) {
    html.push('<h2>Recommended Hardware</h2>');
    for (const recommendation of productRecommendations) {
      const product = productMap.get(recommendation.productId);
      if (!product) continue;
      html.push(`<h3>${escapeHtml(recommendation.heading)}</h3>`);
      html.push(paragraphHtml(recommendation.rationale));
      html.push(affiliateProductHtml(product));
    }
  }

  html.push('<h2>Frequently Asked Questions</h2>');
  for (const faq of article.faq) html.push(faqBlockHtml(faq.question, faq.answer));

  html.push('<h2>Conclusion</h2>');
  html.push(...article.conclusion.map(paragraphHtml));

  const linkedArticles = article.suggestedRelatedArticleIds
    .map((id) => relatedMap.get(id))
    .filter((item): item is AiSeoArticleContext => Boolean(item))
    .slice(0, 8);
  if (linkedArticles.length) {
    html.push('<h2>Related GTA VI News &amp; Guides</h2>');
    html.push(
      `<ul>${linkedArticles
        .map(
          (item) =>
            `<li><a href="/articles/${escapeAttribute(item.slug)}">${escapeHtml(item.title)}</a></li>`,
        )
        .join('')}</ul>`,
    );
  }

  return richTextBody(html.join('\n'));
}

function paragraphHtml(value: string) {
  return `<p>${escapeHtml(value)}</p>`;
}

function listHtml(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function tableHtml(headers: string[], rows: string[][]) {
  return `<table><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody></table>`;
}

function faqBlockHtml(question: string, answer: string) {
  return `<cms-block kind="faq" argument="" contenteditable="false"><strong>faq</strong><span>Q: ${escapeHtml(question)}\nA: ${escapeHtml(answer)}</span></cms-block><p><br></p>`;
}

function escapeAttribute(value: string) {
  return escapeHtml(value.replace(/[\r\n]+/g, ' ').trim());
}
