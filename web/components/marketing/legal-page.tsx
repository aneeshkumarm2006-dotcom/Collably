import { Container } from '@/components/marketing/section';
import { Prose } from '@/components/marketing/prose';

/**
 * Shared chrome for legal pages (privacy / terms / cookies): a titled header with
 * a "last updated" stamp, then the long-form body in the `Prose` wrapper.
 */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="bg-page py-16 sm:py-20">
      <Container size="narrow">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Legal</p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-faint">Last updated {lastUpdated}</p>
        {intro && <p className="mt-6 text-pretty text-lg leading-relaxed text-muted">{intro}</p>}
        <hr className="my-8 border-hair" />
        <Prose>{children}</Prose>
      </Container>
    </article>
  );
}
