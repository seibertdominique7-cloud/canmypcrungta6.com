import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

import { requireAdminApi } from './admin-auth';

describe('AI SEO admin route protection dependency', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'test-admin-password';
    process.env.SESSION_SECRET = 'x'.repeat(48);
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.SESSION_SECRET;
  });

  it('rejects a same-origin API request without an admin session', async () => {
    const response = await requireAdminApi(
      new Request('http://localhost/api/admin/ai-seo-publisher/generate'),
    );
    expect(response?.status).toBe(401);
  });

  it('rejects a cross-origin mutation before processing it', async () => {
    const response = await requireAdminApi(
      new Request('http://localhost/api/admin/ai-seo-publisher/generate', {
        method: 'POST',
        headers: { Origin: 'https://attacker.example' },
      }),
    );
    expect(response?.status).toBe(403);
  });
});
