export function withFallbackImageAlt(html: string, fallback: string) {
  const safeFallback = fallback.trim() || 'Content image';
  const escapedFallback = safeFallback
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const alt = /\balt\s*=\s*(["'])(.*?)\1/i.exec(tag);
    if (alt?.[2].trim()) return tag;
    if (alt) return tag.replace(alt[0], `alt="${escapedFallback}"`);
    return tag.replace(/^<img\b/i, `<img alt="${escapedFallback}"`);
  });
}
