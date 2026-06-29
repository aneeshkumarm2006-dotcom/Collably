import { Check, CheckCheck, Clock } from 'lucide-react';

import type { Message } from '@/lib/shared';
import { cn } from '@/lib/utils';
import { shortTime } from '@/lib/chat/time';

/**
 * One chat message bubble. Outgoing sits right on the brand fill; incoming sits
 * left on a card surface. Consecutive messages from the same sender are tightened
 * (the tail is dropped). Outgoing bubbles carry delivery state inline: a clock
 * while the optimistic send is pending, a single check once sent, double checks
 * once the recipient has read it.
 */
export function MessageBubble({
  message,
  mine,
  tight = false,
}: {
  message: Message;
  mine: boolean;
  /** Same sender as the message just above: tighten spacing, drop the tail. */
  tight?: boolean;
}) {
  const pending = message._id.startsWith('temp-');

  return (
    <div
      className={cn('flex px-3', mine ? 'justify-end' : 'justify-start', tight ? 'mt-0.5' : 'mt-2.5')}
    >
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3 py-2 shadow-sm',
          mine ? 'bg-brand text-white' : 'border border-hair bg-card text-ink',
          mine && !tight && 'rounded-tr-sm',
          !mine && !tight && 'rounded-tl-sm',
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-snug">{message.body}</p>
        <div
          className={cn(
            'mt-0.5 flex items-center justify-end gap-1',
            mine ? 'text-white/70' : 'text-faint',
          )}
        >
          <span className="font-mono text-[10px] leading-none">{shortTime(message.createdAt)}</span>
          {mine &&
            (pending ? (
              <Clock className="h-3 w-3" aria-label="Sending" />
            ) : message.readAt ? (
              <CheckCheck className="h-3.5 w-3.5" aria-label="Read" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-label="Sent" />
            ))}
        </div>
      </div>
    </div>
  );
}

/** Centered date pill between days (WhatsApp-style). */
export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-md bg-secondary px-3 py-1 text-[11px] font-semibold tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}

/** Animated "•••" typing bubble shown on the incoming side. */
export function TypingBubble() {
  return (
    <div className="flex justify-start px-3 pt-2.5">
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-hair bg-card px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '1s' }}
          />
        ))}
      </div>
    </div>
  );
}
