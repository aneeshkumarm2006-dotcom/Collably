import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/section';

export interface CtaBandProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  className?: string;
}

/**
 * The full-width brand CTA band used to close marketing pages: brand-blue
 * background, centered heading + subtext, and up to two buttons.
 */
export function CtaBand({
  eyebrow,
  title,
  subtitle,
  primary = { label: "Get started, it's free", href: '/signup' },
  secondary = { label: 'Browse campaigns', href: '/explore' },
  className,
}: CtaBandProps) {
  return (
    <section className={cn('bg-brand py-20 text-center text-white sm:py-28', className)}>
      <Container size="narrow">
        {eyebrow && (
          <span className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-white/70">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-white/85">{subtitle}</p>
        )}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {primary && (
            <Button
              asChild
              size="lg"
              className="bg-white text-brand shadow-sm hover:bg-white/90"
            >
              <Link href={primary.href}>
                {primary.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {secondary && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
