import 'server-only';

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AdminDataError } from './admin-data-error';
import { detectImageMimeType, MEDIA_MIME_TYPES, type MediaMimeType } from './media-validation';
import type { MediaStorageStatus } from './cms-types';

export type UploadStorageProvider = 'local' | 'vercel-blob' | 'cloudinary' | 's3';

export interface StoredMedia {
  filename: string;
  originalFilename: string;
  storageKey: string;
  url: string;
  sourceType: 'upload';
  storageProvider: UploadStorageProvider;
  mimeType: MediaMimeType;
  fileSize: number;
  width: number | null;
  height: number | null;
}

export interface MediaStorage {
  readonly provider: UploadStorageProvider;
  save(file: File): Promise<StoredMedia>;
  delete(storageKey: string, url?: string): Promise<void>;
}

export function getMediaStorage(providerOverride?: string): MediaStorage {
  const provider = normalizeProvider(providerOverride ?? process.env.MEDIA_STORAGE_PROVIDER ?? 'local');
  const status = getMediaStorageStatus(provider);
  if (!status.configured) throw new AdminDataError(status.message, 503);
  if (provider === 'local') return new LocalMediaStorage();
  if (provider === 'vercel-blob') return new VercelBlobStorage(required('BLOB_READ_WRITE_TOKEN', provider));
  if (provider === 'cloudinary') return new CloudinaryStorage(required('CLOUDINARY_URL', provider));
  return new S3Storage({
    bucket: required('S3_BUCKET', provider),
    region: required('S3_REGION', provider),
    accessKeyId: required('S3_ACCESS_KEY_ID', provider),
    secretAccessKey: required('S3_SECRET_ACCESS_KEY', provider),
    endpoint: process.env.S3_ENDPOINT?.trim(),
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.trim(),
  });
}

export function getMediaStorageStatus(providerOverride?: string): MediaStorageStatus {
  const provider = normalizeProvider(providerOverride ?? process.env.MEDIA_STORAGE_PROVIDER ?? 'local');
  const missing = provider === 'vercel-blob'
    ? missingVariables(['BLOB_READ_WRITE_TOKEN'])
    : provider === 'cloudinary'
      ? missingVariables(['CLOUDINARY_URL'])
      : provider === 's3'
        ? missingVariables(['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'])
        : [];
  const productionLocal = provider === 'local' && process.env.NODE_ENV === 'production';
  return {
    provider,
    configured: !productionLocal && missing.length === 0,
    persistent: provider !== 'local',
    maxUploadMb: getMaxUploadMb(),
    message: productionLocal
      ? 'Local media storage is not permanent in production. Select Vercel Blob, Cloudinary, or S3 before uploading.'
      : missing.length
        ? `${provider} media storage is missing: ${missing.join(', ')}.`
        : provider === 'local'
          ? 'Uploads are stored in public/uploads for local development only.'
          : `${provider} media storage is configured for persistent uploads.`,
  };
}

class LocalMediaStorage implements MediaStorage {
  readonly provider = 'local' as const;

  async save(file: File): Promise<StoredMedia> {
    const upload = await inspectUpload(file);
    const storageKey = createStorageKey(upload.filename);
    const root = path.resolve(process.cwd(), 'public', 'uploads');
    const target = safeLocalTarget(root, storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, upload.bytes, { flag: 'wx' });
    return stored(upload, storageKey, `/uploads/${storageKey.replace(/\\/g, '/')}`, this.provider);
  }

  async delete(storageKey: string) {
    const root = path.resolve(process.cwd(), 'public', 'uploads');
    const target = safeLocalTarget(root, storageKey);
    try { await unlink(target); } catch (error) { if (!isMissingFile(error)) throw error; }
  }
}

class VercelBlobStorage implements MediaStorage {
  readonly provider = 'vercel-blob' as const;
  constructor(private readonly token: string) {}

  async save(file: File): Promise<StoredMedia> {
    const upload = await inspectUpload(file);
    const storageKey = createStorageKey(upload.filename);
    const response = await fetch(`https://blob.vercel-storage.com/${encodePath(storageKey)}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': upload.mimeType, 'x-api-version': '7', 'x-add-random-suffix': '0' },
      body: Uint8Array.from(upload.bytes),
    });
    const payload = await readProviderJson(response, 'Vercel Blob upload failed.') as { url?: string };
    if (!payload.url) throw new AdminDataError('Vercel Blob did not return an image URL.', 502);
    return stored(upload, storageKey, payload.url, this.provider);
  }

  async delete(_storageKey: string, url?: string) {
    if (!url) return;
    const response = await fetch('https://blob.vercel-storage.com/delete', { method: 'POST', headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'x-api-version': '7' }, body: JSON.stringify({ urls: [url] }) });
    if (!response.ok && response.status !== 404) throw new AdminDataError('Vercel Blob could not delete the stored image.', 502);
  }
}

class CloudinaryStorage implements MediaStorage {
  readonly provider = 'cloudinary' as const;
  private readonly config: { cloudName: string; apiKey: string; apiSecret: string };
  constructor(url: string) { this.config = parseCloudinaryUrl(url); }

  async save(file: File): Promise<StoredMedia> {
    const upload = await inspectUpload(file);
    const publicId = `media/${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${path.basename(upload.filename, path.extname(upload.filename))}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sha1(`public_id=${publicId}&timestamp=${timestamp}${this.config.apiSecret}`);
    const form = new FormData();
    form.set('file', new Blob([Uint8Array.from(upload.bytes)], { type: upload.mimeType }), upload.originalFilename);
    form.set('api_key', this.config.apiKey); form.set('timestamp', timestamp); form.set('public_id', publicId); form.set('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.config.cloudName)}/image/upload`, { method: 'POST', body: form });
    const payload = await readProviderJson(response, 'Cloudinary upload failed.') as { secure_url?: string; width?: number; height?: number };
    if (!payload.secure_url) throw new AdminDataError('Cloudinary did not return an image URL.', 502);
    return { ...stored(upload, publicId, payload.secure_url, this.provider), width: payload.width ?? upload.width, height: payload.height ?? upload.height };
  }

  async delete(storageKey: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sha1(`public_id=${storageKey}&timestamp=${timestamp}${this.config.apiSecret}`);
    const form = new URLSearchParams({ public_id: storageKey, timestamp, api_key: this.config.apiKey, signature });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(this.config.cloudName)}/image/destroy`, { method: 'POST', body: form });
    if (!response.ok) throw new AdminDataError('Cloudinary could not delete the stored image.', 502);
  }
}

interface S3Config { bucket: string; region: string; accessKeyId: string; secretAccessKey: string; endpoint?: string; publicBaseUrl?: string }
class S3Storage implements MediaStorage {
  readonly provider = 's3' as const;
  constructor(private readonly config: S3Config) {}

  async save(file: File): Promise<StoredMedia> {
    const upload = await inspectUpload(file);
    const storageKey = createStorageKey(upload.filename);
    await this.request('PUT', storageKey, upload.bytes, upload.mimeType);
    return stored(upload, storageKey, this.publicUrl(storageKey), this.provider);
  }

  async delete(storageKey: string) { await this.request('DELETE', storageKey, Buffer.alloc(0)); }

  private async request(method: 'PUT' | 'DELETE', storageKey: string, bytes: Buffer, mimeType?: string) {
    const url = this.requestUrl(storageKey); const now = new Date(); const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); const date = amzDate.slice(0, 8);
    const payloadHash = sha256(bytes); const headers: Record<string, string> = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    if (mimeType) headers['content-type'] = mimeType;
    const signedHeaderNames = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name].trim()}\n`).join('');
    const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaderNames.join(';'), payloadHash].join('\n');
    const scope = `${date}/${this.config.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
    const key = hmac(hmac(hmac(hmac(`AWS4${this.config.secretAccessKey}`, date), this.config.region), 's3'), 'aws4_request');
    const signature = createHmac('sha256', key).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames.join(';')}, Signature=${signature}`;
    const response = await fetch(url, { method, headers: { ...headers, authorization }, body: method === 'PUT' ? Uint8Array.from(bytes) : undefined });
    if (!response.ok && !(method === 'DELETE' && response.status === 404)) throw new AdminDataError(`S3 media ${method === 'PUT' ? 'upload' : 'delete'} failed (${response.status}).`, 502);
  }

  private requestUrl(storageKey: string) {
    const base = this.config.endpoint ? this.config.endpoint.replace(/\/$/, '') : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
    const includeBucket = Boolean(this.config.endpoint); const prefix = includeBucket ? `/${encodeURIComponent(this.config.bucket)}` : '';
    return new URL(`${base}${prefix}/${encodePath(storageKey)}`);
  }
  private publicUrl(storageKey: string) { return `${(this.config.publicBaseUrl ?? this.requestUrl('').origin).replace(/\/$/, '')}/${encodePath(storageKey)}`; }
}

interface InspectedUpload { bytes: Buffer; filename: string; originalFilename: string; mimeType: MediaMimeType; fileSize: number; width: number | null; height: number | null }
async function inspectUpload(file: File): Promise<InspectedUpload> {
  const maxBytes = getMaxUploadMb() * 1024 * 1024;
  if (file.size < 1 || file.size > maxBytes) throw new AdminDataError(`Images must be between 1 byte and ${getMaxUploadMb()} MB.`, 400);
  if (!MEDIA_MIME_TYPES.includes(file.type as MediaMimeType)) throw new AdminDataError('Upload a JPEG, PNG, WebP, or AVIF image.', 400);
  const bytes = Buffer.from(await file.arrayBuffer()); const detected = detectImageMimeType(bytes);
  if (!detected || detected !== file.type) throw new AdminDataError('The file contents do not match a supported image type.', 400);
  const filename = sanitizeFilename(file.name, detected);
  return { bytes, filename, originalFilename: file.name.slice(0, 255), mimeType: detected, fileSize: file.size, ...readImageDimensions(bytes, detected) };
}

function stored(upload: InspectedUpload, storageKey: string, url: string, storageProvider: UploadStorageProvider): StoredMedia {
  return { filename: upload.filename, originalFilename: upload.originalFilename, mimeType: upload.mimeType, fileSize: upload.fileSize, width: upload.width, height: upload.height, storageKey, url, sourceType: 'upload', storageProvider };
}
function createStorageKey(filename: string) { return `${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${filename}`; }
function sanitizeFilename(value: string, mimeType: MediaMimeType) {
  const extensions: Record<MediaMimeType, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
  const base = path.basename(value, path.extname(value)).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
  return `${base}${extensions[mimeType]}`;
}
function readImageDimensions(bytes: Buffer, mimeType: MediaMimeType) {
  try {
    if (mimeType === 'image/png' && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    if (mimeType === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii', 12, 16) === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (mimeType === 'image/jpeg') { let offset = 2; while (offset + 9 < bytes.length) { if (bytes[offset] !== 0xff) { offset += 1; continue; } const marker = bytes[offset + 1]; const length = bytes.readUInt16BE(offset + 2); if (marker >= 0xc0 && marker <= 0xc3) return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }; offset += 2 + length; } }
  } catch { return { width: null, height: null }; }
  return { width: null, height: null };
}
function safeLocalTarget(root: string, storageKey: string) { const target = path.resolve(root, storageKey); if (!target.startsWith(`${root}${path.sep}`)) throw new AdminDataError('Invalid media storage key.', 400); return target; }
function normalizeProvider(value: string): UploadStorageProvider { const provider = value.trim().toLowerCase(); if (provider === 'local' || provider === 'vercel-blob' || provider === 'cloudinary' || provider === 's3') return provider; throw new AdminDataError(`Unsupported MEDIA_STORAGE_PROVIDER "${provider}".`, 503); }
function getMaxUploadMb() { const value = Number(process.env.MEDIA_MAX_UPLOAD_MB ?? '8'); return Number.isFinite(value) && value >= 1 && value <= 100 ? Math.round(value) : 8; }
function missingVariables(names: string[]) { return names.filter((name) => !process.env[name]?.trim()); }
function required(name: string, provider: string) { const value = process.env[name]?.trim(); if (!value) throw new AdminDataError(`${name} is required for ${provider} media storage.`, 503); return value; }
function encodePath(value: string) { return value.split('/').map(encodeURIComponent).join('/'); }
function sha1(value: string) { return createHash('sha1').update(value).digest('hex'); }
function sha256(value: string | Buffer) { return createHash('sha256').update(value).digest('hex'); }
function hmac(key: string | Buffer, value: string) { return createHmac('sha256', key).update(value).digest(); }
function parseCloudinaryUrl(value: string) { try { const url = new URL(value); if (url.protocol !== 'cloudinary:' || !url.username || !url.password || !url.hostname) throw new Error(); return { apiKey: decodeURIComponent(url.username), apiSecret: decodeURIComponent(url.password), cloudName: url.hostname }; } catch { throw new AdminDataError('CLOUDINARY_URL must use cloudinary://api-key:api-secret@cloud-name.', 503); } }
async function readProviderJson(response: Response, fallback: string) { const payload = await response.json().catch(() => ({})); if (!response.ok) { const message = typeof payload === 'object' && payload && 'error' in payload ? JSON.stringify(payload.error) : fallback; throw new AdminDataError(message || fallback, 502); } return payload; }
function isMissingFile(error: unknown): error is NodeJS.ErrnoException { return error instanceof Error && 'code' in error && error.code === 'ENOENT'; }
