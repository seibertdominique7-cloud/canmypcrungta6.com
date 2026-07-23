import 'server-only';

import { AdminDataError } from './admin-data-error';
import { CONTACT_STATUSES, type ContactStatus, type ContactSubmissionRecord } from './contact-types';
import { prisma } from './prisma';

export async function getContactSubmissions(): Promise<ContactSubmissionRecord[]> {
  const submissions = await prisma.contactSubmission.findMany({ orderBy: { createdAt: 'desc' } });
  return submissions.map(serializeContactSubmission);
}

export async function updateContactSubmissionStatus(id: string, status: string) {
  if (!CONTACT_STATUSES.includes(status as ContactStatus)) throw new AdminDataError('Choose a valid contact status.', 400);
  const existing = await prisma.contactSubmission.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AdminDataError('Contact message not found.', 404);
  await prisma.contactSubmission.update({ where: { id }, data: { status } });
}

export async function deleteContactSubmission(id: string) {
  const existing = await prisma.contactSubmission.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AdminDataError('Contact message not found.', 404);
  await prisma.contactSubmission.delete({ where: { id } });
}

function serializeContactSubmission(item: Awaited<ReturnType<typeof prisma.contactSubmission.findFirstOrThrow>>): ContactSubmissionRecord {
  return {
    ...item,
    status: CONTACT_STATUSES.includes(item.status as ContactStatus) ? item.status as ContactStatus : 'new',
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
