export interface BrevoConfiguration {
  apiKey: string;
  listId: number;
  senderEmail: string;
  senderName: string;
}

export type BrevoConfigurationResult =
  | { configuration: BrevoConfiguration; issues: [] }
  | { configuration: null; issues: string[] };

type BrevoEnvironment = Readonly<Record<string, string | undefined>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBrevoConfiguration(
  environment: BrevoEnvironment,
): BrevoConfigurationResult {
  const apiKey = environment.BREVO_API_KEY?.trim() ?? '';
  const listIdValue = environment.BREVO_LIST_ID?.trim() ?? '';
  const senderEmail = environment.BREVO_SENDER_EMAIL?.trim() ?? '';
  const senderName = environment.BREVO_SENDER_NAME?.trim() ?? '';
  const listId = Number(listIdValue);
  const issues: string[] = [];

  if (!apiKey) issues.push('BREVO_API_KEY is not configured.');
  if (!listIdValue) {
    issues.push('BREVO_LIST_ID is not configured.');
  } else if (!Number.isInteger(listId) || listId <= 0) {
    issues.push('BREVO_LIST_ID must be a positive integer.');
  }
  if (!senderEmail) {
    issues.push('BREVO_SENDER_EMAIL is not configured.');
  } else if (!EMAIL_PATTERN.test(senderEmail)) {
    issues.push('BREVO_SENDER_EMAIL must be a valid email address.');
  }
  if (!senderName) issues.push('BREVO_SENDER_NAME is not configured.');

  if (issues.length > 0) {
    return { configuration: null, issues };
  }

  return {
    configuration: { apiKey, listId, senderEmail, senderName },
    issues: [],
  };
}
