import { describe, expect, it } from 'vitest';

import { detectImageMimeType, validateExternalImageUrl } from './media-validation';

describe('media validation', () => {
  it('accepts exact public HTTPS URLs and rejects unsafe schemes', () => {
    expect(validateExternalImageUrl('https://cdn.example.com/image.webp')).toEqual({ ok: true, value: 'https://cdn.example.com/image.webp' });
    expect(validateExternalImageUrl('http://cdn.example.com/image.webp')).toEqual({ ok: false, error: 'External images must use HTTPS.' });
    expect(validateExternalImageUrl('https://localhost/image.webp')).toEqual({ ok: false, error: 'Enter a public HTTPS image URL.' });
  });

  it('uses file signatures instead of trusting the browser MIME type', () => {
    expect(detectImageMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageMimeType(new TextEncoder().encode('MZ executable'))).toBeNull();
    expect(detectImageMimeType(new TextEncoder().encode('0000ftypavif0000'))).toBe('image/avif');
  });
});
