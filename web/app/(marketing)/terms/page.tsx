import type { Metadata } from 'next';

import { buildMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/marketing/legal-page';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'The terms that govern your use of the Collably marketplace.',
  path: '/terms',
  ogEyebrow: 'Legal',
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated="28 June 2026"
      intro="These Terms of Service govern your access to and use of Collably. By creating an account or using the platform, you agree to these terms."
    >
      <h2>1. The service</h2>
      <p>
        Collably is a marketplace that connects businesses running gifting/collab campaigns with
        creators. We provide the platform; the agreement for any specific collaboration is between the
        business and the creator.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information and keep your credentials secure. You are responsible
        for activity under your account. You must be at least 16 years old to use Collably.
      </p>

      <h2>3. Campaigns, applications & rewards</h2>
      <ul>
        <li>Businesses are responsible for the accuracy of their campaigns and for providing the stated reward to creators whose verified work meets the campaign requirements.</li>
        <li>Creators are responsible for producing the agreed deliverables and submitting truthful proof.</li>
        <li>Rewards are provided directly by the business to the creator; Collably is not a party to that exchange and does not hold funds.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Post false, misleading, infringing, or unlawful content;</li>
        <li>Misrepresent your identity, audience, or deliverables;</li>
        <li>Harass other users or attempt to circumvent platform safety features;</li>
        <li>Scrape, disrupt, or reverse-engineer the service.</li>
      </ul>

      <h2>5. Content & licence</h2>
      <p>
        You retain ownership of content you create. By posting on Collably you grant us a limited
        licence to host and display that content for the purpose of operating the service. Licences
        between a business and a creator for campaign deliverables are set in the campaign terms.
      </p>

      <h2>6. Moderation</h2>
      <p>
        We may review, remove, suspend, or restrict content and accounts that violate these terms or
        our policies, at our discretion.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
        that any campaign will receive applications, that any creator will be accepted, or that any
        collaboration will meet your expectations.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Collably is not liable for indirect, incidental, or
        consequential damages, or for disputes between businesses and creators arising from a
        collaboration.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using Collably at any time. We may suspend or terminate access for violations of
        these terms. Some provisions survive termination, including content licences granted to other
        users and limitations of liability.
      </p>

      <h2>10. Changes & contact</h2>
      <p>
        We may update these terms; continued use after changes constitutes acceptance. Questions?
        Email <a href="mailto:legal@collably.app">legal@collably.app</a> or use our{' '}
        <a href="/contact">contact form</a>.
      </p>
    </LegalPage>
  );
}
