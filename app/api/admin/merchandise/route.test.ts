import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const originalPassword = process.env.ADMIN_PASSWORD;
const originalSecret = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.ADMIN_PASSWORD = originalPassword;
  process.env.SESSION_SECRET = originalSecret;
  vi.restoreAllMocks();
});

describe('merchandise admin API authentication', () => {
  it('rejects an unauthenticated request without exposing catalog data', async () => {
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.SESSION_SECRET = 'a-secure-test-secret-that-is-long-enough';
    const response = await GET(new Request('http://localhost/api/admin/merchandise'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'ADMIN_SESSION_MISSING',
    });
  });
});
