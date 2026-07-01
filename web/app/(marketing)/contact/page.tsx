import type { Metadata } from 'next';
import { Mail, MapPin, MessageSquare } from 'lucide-react';

import { buildMetadata } from '@/lib/seo';
import { CONTACT_TOPICS, type ContactTopic } from '@/lib/contact';
import { Section, SectionLabel } from '@/components/marketing/section';
import { ContactForm } from '@/components/marketing/contact-form';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description:
    'Get in touch with the Collably team about creator collabs, running campaigns, press, or support. We usually reply within one business day.',
  path: '/contact',
  ogEyebrow: 'Contact',
});

const CHANNELS = [
  { icon: Mail, label: 'Email', value: 'hello@collably.app', href: 'mailto:hello@collably.app' },
  { icon: MessageSquare, label: 'Support', value: 'support@collably.app', href: 'mailto:support@collably.app' },
  { icon: MapPin, label: 'Based in', value: 'Toronto · Vancouver · Montreal' },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const defaultTopic = CONTACT_TOPICS.includes(topic as ContactTopic)
    ? (topic as ContactTopic)
    : undefined;

  return (
    <Section tone="page">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <SectionLabel>Contact</SectionLabel>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Let&apos;s talk
          </h1>
          <p className="mt-5 max-w-md text-pretty text-lg text-muted">
            Have a question about collabs, campaigns, or partnerships? Send us a note and we&apos;ll
            get back to you, usually within one business day.
          </p>

          <ul className="mt-9 flex flex-col gap-5">
            {CHANNELS.map((c) => (
              <li key={c.label} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    {c.label}
                  </div>
                  {c.href ? (
                    <a href={c.href} className="text-[15px] font-medium text-ink hover:text-brand">
                      {c.value}
                    </a>
                  ) : (
                    <div className="text-[15px] font-medium text-ink">{c.value}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <ContactForm defaultTopic={defaultTopic} />
      </div>
    </Section>
  );
}
