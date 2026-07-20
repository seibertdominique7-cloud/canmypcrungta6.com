import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { AdminDataError } from './admin-data-error';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export interface StoredMedia {
  filename: string;
  storageKey: string;
  url: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}

export interface MediaStorage {
  save(file: File): Promise<StoredMedia>;
  delete(storageKey: string): Promise<void>;
}

export function getMediaStorage(): MediaStorage {
  const provider = (process.env.MEDIA_STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider !== 'local') {
    throw new AdminDataError(`MEDIA_STORAGE_PROVIDER "${provider}" is not configured. Add its adapter before accepting uploads.`, 503);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new AdminDataError('Permanent production media storage is not configured. Set MEDIA_STORAGE_PROVIDER to a deployed storage adapter.', 503);
  }
  return new LocalMediaStorage();
}

class LocalMediaStorage implements MediaStorage {
  async save(file: File): Promise<StoredMedia> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new AdminDataError('Upload a JPEG, PNG, GIF, or WebP image.', 400);
    if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) throw new AdminDataError('Images must be between 1 byte and 8 MB.', 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const cleanName = sanitizeFilename(file.name);
    const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}-${cleanName}`;
    const root = path.resolve(process.cwd(), 'public', 'uploads');
    const target = path.resolve(root, storageKey);
    if (!target.startsWith(`${root}${path.sep}`)) throw new AdminDataError('Invalid upload filename.', 400);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx' });
    const dimensions = readImageDimensions(bytes, file.type);
    return { filename: cleanName, storageKey, url: `/uploads/${storageKey.replace(/\\/g, '/')}`, mimeType: file.type, fileSize: file.size, ...dimensions };
  }

  async delete(storageKey: string) {
    const root = path.resolve(process.cwd(), 'public', 'uploads');
    const target = path.resolve(root, storageKey);
    if (!target.startsWith(`${root}${path.sep}`)) throw new AdminDataError('Invalid media storage key.', 400);
    try { await unlink(target); } catch (error) { if (!isMissingFile(error)) throw error; }
  }
}

function sanitizeFilename(value: string) {
  const extension = path.extname(value).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const base = path.basename(value, path.extname(value)).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'image';
  return `${base}${extension}`;
}

function readImageDimensions(bytes: Buffer, mimeType: string) {
  try {
    if (mimeType === 'image/png' && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    if (mimeType === 'image/gif' && bytes.length >= 10) return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
    if (mimeType === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii', 12, 16) === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
    if (mimeType === 'image/jpeg') {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) { offset += 1; continue; }
        const marker = bytes[offset + 1];
        const length = bytes.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xc3) return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
        offset += 2 + length;
      }
    }
  } catch { return { width: null, height: null }; }
  return { width: null, height: null };
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException { return error instanceof Error && 'code' in error && error.code === 'ENOENT'; }

