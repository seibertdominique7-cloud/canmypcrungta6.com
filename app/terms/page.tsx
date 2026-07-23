import { RequiredPageRoute, requiredPageMetadata } from '../lib/required-page-route';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => requiredPageMetadata('terms');
export default function Page() { return <RequiredPageRoute pageKey="terms" />; }
