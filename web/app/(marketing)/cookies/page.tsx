import type { Metadata } from 'next';

import { buildMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/marketing/legal-page';

export const metadata: Metadata = buildMetadata({
  title: 'Cookie Policy',
  description: 'How and why Collably uses cookies and similar technologies.',
  path: '/cookies',
  ogEyebrow: 'Legal',
});

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated="28 June 2026"
      intro="This Cookie Policy explains how Collably uses cookies and similar technologies to recognise you and improve your experience."
    >
      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help the
        site remember your actions and preferences over time.
      </p>

      <h2>2. How we use cookies</h2>
      <ul>
        <li>
          <strong>Essential cookies</strong> — required to keep you signed in (our session cookies)
          and to operate core features. The site won&apos;t work properly without these.
        </li>
        <li>
          <strong>Preference cookies</strong> — remember choices such as your light/dark theme.
        </li>
        <li>
          <strong>Analytics cookies</strong> — help us understand how the site is used so we can
          improve it. These are aggregated and non-identifying where possible.
        </li>
      </ul>

      <h2>3. Managing cookies</h2>
      <p>
        Most browsers let you block or delete cookies in their settings. Blocking essential cookies
        will sign you out and may break parts of the site. Where required, we&apos;ll ask for your
        consent to non-essential cookies before setting them.
      </p>

      <h2>4. Third parties</h2>
      <p>
        Some features rely on third-party services (for example, sign-in providers, image hosting, or
        maps) that may set their own cookies subject to their privacy policies.
      </p>

      <h2>5. Changes & contact</h2>
      <p>
        We may update this policy as our use of cookies evolves. Questions? Email{' '}
        <a href="mailto:privacy@collably.app">privacy@collably.app</a> or see our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}
