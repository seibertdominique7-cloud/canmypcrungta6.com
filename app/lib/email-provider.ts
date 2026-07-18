import 'server-only';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

export interface EmailDeliveryResult {
  providerMessageId: string;
}

export interface EmailProviderAdapter {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

export interface EmailProviderConfiguration {
  provider: string | null;
  fromAddress: string | null;
  hasApiKey: boolean;
  adapterConnected: false;
}

export function getEmailProviderConfiguration(): EmailProviderConfiguration {
  return {
    provider: process.env.EMAIL_PROVIDER?.trim() || null,
    fromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() || null,
    hasApiKey: Boolean(process.env.EMAIL_API_KEY?.trim()),
    adapterConnected: false,
  };
}

// Provider delivery is intentionally disabled until an adapter is explicitly installed.
export function getEmailProviderAdapter(): EmailProviderAdapter | null {
  return null;
}
