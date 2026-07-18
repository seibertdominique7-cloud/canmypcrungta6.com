export interface SubscriberCsvRecord {
  email: string;
  status: string;
  gtaUpdatesConsent: boolean;
  marketingConsent: boolean;
  scenario: string | null;
  signupSource: string;
  createdAt: Date;
  updatedAt: Date;
  unsubscribedAt: Date | null;
  lastEmailSentAt: Date | null;
}

export function formatSubscriberCsv(subscribers: SubscriberCsvRecord[]) {
  const header = [
    'Email',
    'Status',
    'GTA Updates Consent',
    'Marketing Consent',
    'Scenario',
    'Signup Source',
    'Created At',
    'Updated At',
    'Unsubscribed At',
    'Last Email Sent At',
  ];
  const rows = subscribers.map((subscriber) => [
    subscriber.email,
    subscriber.status,
    subscriber.gtaUpdatesConsent ? 'Yes' : 'No',
    subscriber.marketingConsent ? 'Yes' : 'No',
    subscriber.scenario ?? '',
    subscriber.signupSource,
    subscriber.createdAt.toISOString(),
    subscriber.updatedAt.toISOString(),
    subscriber.unsubscribedAt?.toISOString() ?? '',
    subscriber.lastEmailSentAt?.toISOString() ?? '',
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: string) {
  const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}
