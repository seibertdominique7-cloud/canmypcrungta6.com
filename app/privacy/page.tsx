import { RequiredPageRoute, requiredPageMetadata } from '../lib/required-page-route';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => requiredPageMetadata('privacy');
export default function Page() { return <RequiredPageRoute pageKey="privacy" />; }
