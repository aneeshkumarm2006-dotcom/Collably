'use client';

import { useRef, useState } from 'react';
import { SendHorizonal } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Message input row — an auto-growing textarea + a circular send button. Owns its
 * draft text; reports typing changes (for the indicator) and hands the trimmed
 * body to `onSend`. Enter sends; Shift+Enter inserts a newline.
 */
export function ChatComposer({
  onSend,
  onTyping,
  disabled = false,
}: {
  onSend: (body: string) => void;
  onTyping?: (typing: boolean) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();

  function grow() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function send() {
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    onTyping?.(false);
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = 'auto';
    });
  }

  return (
    <div className="flex items-end gap-2 border-t border-hair bg-card px-3 py-2.5">
      <textarea
        ref={ref}
        value={text}
        rows={1}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.(e.target.value.trim().length > 0);
          grow();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Message…"
        aria-label="Message"
        className="max-h-[140px] flex-1 resize-none rounded-2xl border border-hair bg-secondary px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:bg-card"
      />
      <button
        type="button"
        onClick={send}
        disabled={!trimmed || disabled}
        aria-label="Send message"
        className={cn(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition-opacity hover:bg-brand-secondary',
          (!trimmed || disabled) && 'opacity-50',
        )}
      >
        <SendHorizonal className="h-5 w-5" />
      </button>
    </div>
  );
}
