import type { Metadata } from 'next';

import { buildMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/marketing/legal-page';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How Collably collects, uses, and protects your personal information.',
  path: '/privacy',
  ogEyebrow: 'Legal',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="28 June 2026"
      intro="This Privacy Policy explains what information Collably collects, how we use it, and the choices you have. By using Collably you agree to the practices described here."
    >
      <h2>1. Information we collect</h2>
      <p>
        We collect information you provide directly, such as your name, email address, profile
        details, social handles, campaign content, applications, and messages, as well as
        information generated as you use the platform, including device and usage data.
      </p>

      <h2>2. How we use information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Operate the marketplace and match creators with campaigns;</li>
        <li>Enable applications, collaborations, messaging, and reward verification;</li>
        <li>Send transactional and, where you opt in, marketing notifications;</li>
        <li>Maintain safety, prevent abuse, and comply with legal obligations.</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>
        Your public profile (and, for creators, application pitches you submit) is visible to the
        businesses you interact with. We do not sell your personal information. We share data with
        service providers (e.g. hosting, image storage, email delivery) only as needed to run the
        service, and with authorities where required by law.
      </p>

      <h2>4. Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and to operate the site, and limited
        analytics cookies to understand usage. See our <a href="/cookies">Cookie Policy</a> for
        details and your choices.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain your information for as long as your account is active or as needed to provide the
        service, resolve disputes, and meet legal requirements. You can request deletion of your
        account at any time from your settings.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct, export, or delete your
        personal information, and to object to or restrict certain processing. To exercise these
        rights, contact us at <a href="mailto:privacy@collably.app">privacy@collably.app</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard safeguards to protect your information, including encryption in
        transit and hashed credentials. No method of transmission or storage is completely secure,
        so we cannot guarantee absolute security.
      </p>

      <h2>8. Children</h2>
      <p>Collably is not directed to children under 16, and we do not knowingly collect their data.</p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy from time to time. We will post the updated version here and revise
        the &quot;last updated&quot; date above.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about privacy? Email <a href="mailto:privacy@collably.app">privacy@collably.app</a>{' '}
        or use our <a href="/contact">contact form</a>.
      </p>
    </LegalPage>
  );
}
