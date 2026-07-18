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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 text-center shadow-2xl sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
          Email preferences
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{confirmation.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">{confirmation.description}</p>
        <Link
          className="mt-7 inline-flex rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
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
