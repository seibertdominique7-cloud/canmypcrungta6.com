const BREVO_CONTACTS_ENDPOINT = 'https://api.brevo.com/v3/contacts';
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;

export type BrevoContactSyncResult =
  | { status: 'synced' }
  | {
      status: 'failed';
      reason: 'network' | 'timeout' | 'rejected';
      httpStatus?: number;
      safeMessage?: string;
    };

interface BrevoContactSyncInput {
  apiKey: string;
  email: string;
  listId: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  onResponse?: (response: { status: number; body: string }) => void;
}

export async function upsertBrevoContact({
  apiKey,
  email,
  listId,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  onResponse,
}: BrevoContactSyncInput): Promise<BrevoContactSyncResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(BREVO_CONTACTS_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        updateEnabled: true,
      }),
      signal: controller.signal,
    });
    const responseBody = await readResponseBody(response);
    const developmentBody = sanitizeProviderText(responseBody, [apiKey]);
    onResponse?.({ status: response.status, body: developmentBody });

    if (!response.ok) {
      return {
        status: 'failed',
        reason: 'rejected',
        httpStatus: response.status,
        safeMessage: getSafeProviderMessage(responseBody, [apiKey, email]),
      };
    }

    return { status: 'synced' };
  } catch {
    return {
      status: 'failed',
      reason: controller.signal.aborted ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseBody(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function getSafeProviderMessage(body: string, redactedValues: string[]) {
  let message = '';

  try {
    const parsed = JSON.parse(body) as unknown;
    if (isRecord(parsed) && typeof parsed.message === 'string') {
      message = parsed.message;
    }
  } catch {
    message = body;
  }

  const sanitized = sanitizeProviderText(message, redactedValues);
  return sanitized || 'Brevo rejected the contact sync request.';
}

function sanitizeProviderText(value: string, redactedValues: string[]) {
  let sanitized = value.slice(0, 1_000);

  for (const redactedValue of redactedValues) {
    if (redactedValue) sanitized = sanitized.replaceAll(redactedValue, '[redacted]');
  }

  return sanitized.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
