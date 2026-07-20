const HTTPS_PROTOCOL = 'https:';

export const MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

export type ExternalImageUrlValidation = { ok: true; value: string } | { ok: false; error: string };

export function validateExternalImageUrl(value: string): ExternalImageUrlValidation {
  const exactUrl = value.trim();
  if (!exactUrl) return { ok: false, error: 'Enter an HTTPS image URL.' };
  try {
    const parsed = new URL(exactUrl);
    if (parsed.protocol !== HTTPS_PROTOCOL) return { ok: false, error: 'External images must use HTTPS.' };
    if (parsed.username || parsed.password) return { ok: false, error: 'Image URLs cannot contain embedded credentials.' };
    if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname.endsWith('.local')) return { ok: false, error: 'Enter a public HTTPS image URL.' };
    return { ok: true, value: exactUrl };
  } catch {
    return { ok: false, error: 'Enter a valid HTTPS image URL.' };
  }
}

export function detectImageMimeType(bytes: Uint8Array): MediaMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const brands = ascii(bytes, 8, Math.min(bytes.length, 32));
    if (brands.includes('avif') || brands.includes('avis')) return 'image/avif';
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}
