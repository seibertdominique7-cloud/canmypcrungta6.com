import { describe, expect, it, vi } from 'vitest';

import { upsertBrevoContact } from './brevo-client';

describe('Brevo contact sync', () => {
  it('adds or updates the normalized contact in the configured list', async () => {
    const requests: Array<[URL | RequestInfo, RequestInit | undefined]> = [];
    const fetchMock: typeof fetch = vi.fn(async (input, init) => {
      requests.push([input, init]);
      return new Response(null, { status: 201 });
    });

    const result = await upsertBrevoContact({
      apiKey: 'test-api-key',
      email: 'player@example.com',
      listId: 3,
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ status: 'synced' });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [endpoint, request] = requests[0];
    expect(endpoint).toBe('https://api.brevo.com/v3/contacts');
    expect(request).toMatchObject({
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': 'test-api-key',
      },
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      email: 'player@example.com',
      listIds: [3],
      updateEnabled: true,
    });
  });

  it('returns a safe failure result when Brevo rejects the request', async () => {
    const onResponse = vi.fn();
    const fetchMock = vi.fn(async () =>
      Response.json({ message: 'sensitive provider detail' }, { status: 401 }),
    );

    const result = await upsertBrevoContact({
      apiKey: 'test-api-key',
      email: 'player@example.com',
      listId: 3,
      fetchImpl: fetchMock as typeof fetch,
      onResponse,
    });

    expect(result).toEqual({
      status: 'failed',
      reason: 'rejected',
      httpStatus: 401,
      safeMessage: 'sensitive provider detail',
    });
    expect(onResponse).toHaveBeenCalledWith({
      status: 401,
      body: '{"message":"sensitive provider detail"}',
    });
    expect(JSON.stringify(result)).not.toContain('test-api-key');
  });

  it('accepts an empty successful response when an existing contact is updated', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(
      upsertBrevoContact({
        apiKey: 'test-api-key',
        email: 'existing@example.com',
        listId: 3,
        fetchImpl: fetchMock as typeof fetch,
      }),
    ).resolves.toEqual({ status: 'synced' });
  });
});
