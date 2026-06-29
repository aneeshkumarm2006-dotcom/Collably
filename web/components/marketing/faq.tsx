import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * A FAQ accordion (built on the shadcn Accordion). `defaultOpenFirst` opens the
 * first item on mount. Render alongside `faqPageJsonLd(items)` for rich results.
 */
export function Faq({
  items,
  defaultOpenFirst = true,
  className,
}: {
  items: FaqItem[];
  defaultOpenFirst?: boolean;
  className?: string;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenFirst ? 'faq-0' : undefined}
      className={cn('w-full', className)}
    >
      {items.map((item, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="py-5 text-left text-base">{item.q}</AccordionTrigger>
          <AccordionContent className="max-w-2xl text-[15px] leading-relaxed text-muted">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/** FAQPage JSON-LD for a set of Q&As (pairs with the `Faq` component). */
export function faqPageJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
