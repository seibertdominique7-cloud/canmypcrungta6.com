import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Email Preferences | GTA VI PC Checker',
  robots: { index: false, follow: false },
};

export default async function UnsubscribeConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const confirmation = getConfirmation(status);

  return (
    <main className="public-theme flex min-h-screen items-center justify-center px-4">
      <section className="theme-glass-strong w-full max-w-lg rounded-2xl p-6 text-center sm:p-8">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Email preferences
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{confirmation.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">{confirmation.description}</p>
        <Link
          className="theme-primary-button mt-7 inline-flex rounded-lg px-5 py-3 text-sm font-black"
          href="/"
        >
          Back to PC checker
        </Link>
      </section>
    </main>
  );
}

function getConfirmation(status: string | undefined) {
  if (status === 'success') {
    return {
      title: 'You are unsubscribed',
      description: 'You will no longer receive GTA VI update or hardware-deal emails from us.',
    };
  }

  if (status === 'already') {
    return {
      title: 'Already unsubscribed',
      description: 'This email address was already removed from future email campaigns.',
    };
  }

  return {
    title: 'Link could not be verified',
    description: 'This unsubscribe link is invalid. Contact the site owner if you need help with a deletion request.',
  };
}
