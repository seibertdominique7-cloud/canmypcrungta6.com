export const CONTACT_STATUSES = ['new', 'read', 'resolved', 'spam'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface ContactSubmissionRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  consentAcknowledged: boolean;
  createdAt: string;
  updatedAt: string;
}
