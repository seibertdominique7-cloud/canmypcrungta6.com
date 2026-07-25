import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieState = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieState.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieState.set(name, value);
    },
  }),
}));

import { createAdminSession, requireAdminApi } from './admin-auth';

const adminUrl = 'http://localhost/api/admin/ai-seo-publisher/generate';
const adminOrigin = 'http://localhost';

describe('AI SEO admin route protection dependency', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'test-admin-password';
    process.env.SESSION_SECRET = 'x'.repeat(48);
    cookieState.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.SESSION_SECRET;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns an actionable error when the admin cookie is missing', async () => {
    const response = await requireAdminApi(
      new Request(adminUrl, {
        method: 'POST',
        headers: { Origin: adminOrigin },
      }),
    );
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({
      code: 'ADMIN_SESSION_MISSING',
      error: expect.stringContaining('Sign in again'),
    });
  });

  it('rejects a cross-origin mutation before processing it', async () => {
    const response = await requireAdminApi(
      new Request(adminUrl, {
        method: 'POST',
        headers: { Origin: 'https://attacker.example' },
      }),
    );
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toMatchObject({
      code: 'ADMIN_ORIGIN_REJECTED',
    });
  });

  it('accepts the same signed session cookie used by the admin page', async () => {
    await createAdminSession();
    const token = cookieState.get('gta6_admin_session');
    expect(token).toBeTruthy();

    const response = await requireAdminApi(
      new Request(adminUrl, {
        method: 'POST',
        headers: {
          Cookie: `gta6_admin_session=${token}`,
          Origin: adminOrigin,
        },
      }),
    );
    expect(response).toBeNull();
  });

  it('identifies a session invalidated by an admin password change', async () => {
    await createAdminSession();
    const token = cookieState.get('gta6_admin_session');
    process.env.ADMIN_PASSWORD = 'changed-admin-password';

    const response = await requireAdminApi(
      new Request(adminUrl, {
        method: 'POST',
        headers: {
          Cookie: `gta6_admin_session=${token}`,
          Origin: adminOrigin,
        },
      }),
    );
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({
      code: 'ADMIN_SESSION_INVALID',
      error: expect.stringContaining('Sign in again'),
    });
    expect(console.warn).toHaveBeenCalledWith(
      '[Admin auth] API request rejected',
      expect.objectContaining({
        cookiePresent: true,
        reason: 'invalid_signature',
      }),
    );
  });

  it('identifies an expired session separately', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));
    await createAdminSession();
    const token = cookieState.get('gta6_admin_session');
    vi.setSystemTime(new Date('2026-07-25T01:00:00Z'));

    const response = await requireAdminApi(
      new Request(adminUrl, {
        method: 'POST',
        headers: {
          Cookie: `gta6_admin_session=${token}`,
          Origin: adminOrigin,
        },
      }),
    );
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toMatchObject({
      code: 'ADMIN_SESSION_EXPIRED',
      error: expect.stringContaining('expired'),
    });
  });

  it('reports insecure server configuration separately from session failure', async () => {
    delete process.env.SESSION_SECRET;
    const response = await requireAdminApi(
      new Request(adminUrl, {
        method: 'POST',
        headers: { Origin: adminOrigin },
      }),
    );
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({
      code: 'ADMIN_AUTH_CONFIGURATION_ERROR',
      error: expect.stringContaining('SESSION_SECRET'),
    });
  });
});
