import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | GTA VI PC Checker',
  description: 'Privacy information for the GTA VI PC Checker and its optional email alerts.',
};

export default function PrivacyPage() {
  return (
    <main className="public-theme min-h-screen px-4 py-12 sm:px-6">
      <article className="theme-glass-strong mx-auto max-w-3xl rounded-2xl p-6 sm:p-9">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Site information
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-xs text-slate-500">Last updated July 18, 2026</p>

        <div className="mt-7 space-y-7 text-sm leading-7 text-slate-300">
          <PolicySection title="Compatibility checks">
            Hardware details entered into the checker are used to produce the compatibility result
            shown in your browser. Do not upload screenshots containing personal, account, or other
            sensitive information. Email signup does not store raw OCR text or complete hardware
            specifications.
          </PolicySection>

          <PolicySection title="Email addresses and GTA VI updates">
            If you subscribe, we store your email address and your consent to receive GTA VI release,
            PC requirement, and compatibility updates. This consent is required for the alert list.
            We also record whether signup occurred on the homepage, a screenshot result, or a manual
            result.
          </PolicySection>

          <PolicySection title="Combined signup consent">
            The current signup form uses one notice for GTA VI updates and occasional gaming
            hardware offers. Submitting the form records consent for both types of email. You can
            unsubscribe from future messages at any time.
          </PolicySection>

          <PolicySection title="Compatibility segmentation">
            A results-page signup stores the compatibility scenario, such as PASS_RECOMMENDED,
            FAIL_GPU, or FAIL_RAM. This allows future emails to be relevant to the result without
            storing the screenshot, raw OCR output, or a complete component list.
          </PolicySection>

          <PolicySection title="Unsubscribing and deletion requests">
            Every future campaign can include a secure unsubscribe link. Unsubscribing stops future
            campaigns and records the date of the request; it does not immediately delete the record.
            You may contact the site owner to request permanent deletion of your subscriber record.
          </PolicySection>

          <PolicySection title="Retention">
            Active subscriber records are retained while the subscription remains active. Unsubscribed
            and suppressed records may be retained to honor opt-out choices, prevent unwanted email,
            and document consent history. Records may be deleted when they are no longer needed for
            those purposes.
          </PolicySection>

          <PolicySection title="Future email providers">
            No email delivery provider is currently connected. A provider such as Brevo, Resend,
            Mailchimp, ConvertKit, or another service may be configured later. This policy will be
            updated before subscriber data is sent to a third-party email provider.
          </PolicySection>

          <PolicySection title="Administration and external links">
            The private administration area uses a secure session cookie to keep the owner signed in.
            Affiliate retailers may apply their own privacy and tracking policies after you follow an
            external link.
          </PolicySection>
        </div>

        <Link
          href="/"
          className="theme-primary-button mt-8 inline-flex rounded-lg px-4 py-2.5 text-sm font-black"
        >
          Back to PC checker
        </Link>
      </article>
    </main>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-black text-white">{title}</h2>
      <p className="mt-1">{children}</p>
    </section>
  );
}
