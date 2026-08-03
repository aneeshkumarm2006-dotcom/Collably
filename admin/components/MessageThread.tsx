'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessage } from '@/lib/types';

/**
 * Admin side of the admin↔creator two-way chat. Renders a "Message" toggle that
 * opens an inline panel showing the conversation thread and a composer. State is
 * self-contained: the thread is (re)fetched on open and after each send, so no
 * socket is needed. All network calls go through the same-origin proxy at
 * `/api/creators/:id/messages` — the browser never touches the backend directly.
 */
export function MessageThread({
  creatorId,
  creatorName,
}: {
  creatorId: string;
  creatorName: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/creators/${creatorId}/messages`, { cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Could not load messages (${res.status})`);
      }
      const data = (await res.json()) as { messages?: AdminMessage[] };
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  // Fetch the thread whenever the panel is opened.
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Keep the latest message in view as the thread grows.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/creators/${creatorId}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Could not send (${res.status})`);
      }
      // Backend returns { message: {...} }; tolerate a bare object too.
      const payload = (await res.json()) as { message?: AdminMessage } | AdminMessage;
      const created = (payload as { message?: AdminMessage }).message ?? (payload as AdminMessage);
      // Optimistically append the returned message and clear the composer.
      setMessages((prev) => (created && created._id ? [...prev, created] : prev));
      setDraft('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const canSend = draft.trim().length > 0 && !sending;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-hair bg-white px-3.5 py-2 text-sm font-semibold text-muted transition hover:text-ink"
      >
        Message
      </button>
    );
  }

  return (
    <div className="flex w-72 flex-col gap-2 rounded-md border border-hair bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <p className="truncate text-sm font-semibold text-ink">Chat with {creatorName}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="rounded p-1 text-muted transition hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-64 min-h-[6rem] flex-col gap-2 overflow-y-auto rounded-md bg-elev p-2"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <p className="m-auto text-sm text-faint">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="m-auto px-2 text-center text-sm text-faint">
            No messages yet. Send the first one.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === 'admin';
            return (
              <div
                key={m._id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  mine
                    ? 'self-end bg-brand text-white'
                    : 'self-start border border-hair bg-white text-ink'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <time
                  dateTime={m.createdAt}
                  className={`mt-1 block text-[10px] ${mine ? 'text-white/70' : 'text-faint'}`}
                >
                  {formatTime(m.createdAt)}
                </time>
              </div>
            );
          })
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={`Message ${creatorName}…`}
          rows={2}
          className="w-full resize-none rounded-md border border-hair bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-md border border-hair bg-white px-3 py-1.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
