import { FourthwallCartProvider } from '../components/fourthwall/FourthwallCart';
import { getFourthwallCheckoutBaseUrl } from '../lib/fourthwall';

export default function MerchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FourthwallCartProvider checkoutBaseUrl={getFourthwallCheckoutBaseUrl()}>
      {children}
    </FourthwallCartProvider>
  );
}
