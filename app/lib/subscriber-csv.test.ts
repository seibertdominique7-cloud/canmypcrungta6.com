import { describe, expect, it } from 'vitest';

import { formatSubscriberCsv } from './subscriber-csv';

describe('subscriber CSV export', () => {
  it('exports consent, segmentation, source, and dates', () => {
    const createdAt = new Date('2026-07-18T12:00:00.000Z');
    const csv = formatSubscriberCsv([
      {
        email: 'player@example.com',
        status: 'active',
        gtaUpdatesConsent: true,
        marketingConsent: false,
        scenario: 'FAIL_GPU',
        signupSource: 'manual-result',
        createdAt,
        updatedAt: createdAt,
        unsubscribedAt: null,
        lastEmailSentAt: null,
      },
    ]);

    expect(csv).toContain('"GTA Updates Consent"');
    expect(csv).toContain('"Marketing Consent"');
    expect(csv).toContain('"player@example.com","active","Yes","No","FAIL_GPU","manual-result"');
  });

  it('protects spreadsheet cells from formula injection', () => {
    const date = new Date('2026-07-18T12:00:00.000Z');
    const csv = formatSubscriberCsv([
      {
        email: '=HYPERLINK("https://example.com")',
        status: 'active',
        gtaUpdatesConsent: true,
        marketingConsent: true,
        scenario: null,
        signupSource: 'homepage',
        createdAt: date,
        updatedAt: date,
        unsubscribedAt: null,
        lastEmailSentAt: null,
      },
    ]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
  });
});
