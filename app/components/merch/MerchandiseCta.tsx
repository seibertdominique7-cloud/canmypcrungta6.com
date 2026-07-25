import { merchExternalLinkProps } from '../../lib/merch-types';
import { TrackedMerchLink } from './TrackedMerchLink';

export function MerchandiseCta({
  buttonLabel,
  description,
  heading,
  href,
  openInNewTab,
  placement,
  compact = false,
}: {
  buttonLabel: string;
  description: string;
  heading: string;
  href: string;
  openInNewTab: boolean;
  placement: string;
  compact?: boolean;
}) {
  return (
    <aside
      className={`theme-glass-strong rounded-3xl ${
        compact ? 'p-5 sm:flex sm:items-center sm:justify-between sm:gap-6' : 'p-6 text-center sm:p-8'
      }`}
    >
      <div>
        <h2 className={`${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-black text-white`}>
          {heading}
        </h2>
        <p className={`mt-2 max-w-2xl text-sm leading-6 text-slate-300 ${compact ? '' : 'mx-auto'}`}>
          {description}
        </p>
      </div>
      <TrackedMerchLink
        className={`theme-primary-button inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-black ${compact ? 'mt-4 sm:mt-0' : 'mt-5'}`}
        event="merch_cta_clicked"
        eventDetail={{ placement }}
        href={href}
        {...merchExternalLinkProps(openInNewTab)}
      >
        {buttonLabel}
      </TrackedMerchLink>
    </aside>
  );
}
