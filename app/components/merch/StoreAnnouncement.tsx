'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { trackMerchEvent } from '../../lib/merch-analytics';

const DISMISSAL_KEY = 'gta6-merch-announcement-dismissed';

export function StoreAnnouncement({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDismissed(window.sessionStorage.getItem(DISMISSAL_KEY) === text);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [text]);

  if (dismissed) return null;
  return (
    <aside className="relative z-40 border-b border-pink-300/20 bg-gradient-to-r from-violet-950 via-fuchsia-950 to-violet-950 px-4 py-2.5 text-sm text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 pr-8 text-center">
        <Link
          className="font-bold underline decoration-white/40 underline-offset-4 hover:decoration-white"
          href="/store"
          onClick={() => trackMerchEvent('merch_announcement_clicked', { placement: 'announcement' })}
        >
          {text}
        </Link>
        <button
          aria-label="Dismiss store announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-lg text-white/70 hover:bg-white/10 hover:text-white"
          onClick={() => {
            window.sessionStorage.setItem(DISMISSAL_KEY, text);
            setDismissed(true);
            trackMerchEvent('merch_announcement_dismissed', { placement: 'announcement' });
          }}
          type="button"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
