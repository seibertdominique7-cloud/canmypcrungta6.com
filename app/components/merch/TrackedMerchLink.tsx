'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { trackMerchEvent, type MerchAnalyticsEvent } from '../../lib/merch-analytics';

export function TrackedMerchLink({
  children,
  className,
  event,
  eventDetail,
  href,
  rel,
  target,
}: {
  children: ReactNode;
  className?: string;
  event: MerchAnalyticsEvent;
  eventDetail: Record<string, string>;
  href: string;
  rel?: string;
  target?: '_blank';
}) {
  const onClick = () => trackMerchEvent(event, eventDetail);
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link className={className} href={href} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <a
      className={className}
      href={href}
      onClick={onClick}
      rel={rel}
      target={target}
    >
      {children}
    </a>
  );
}
