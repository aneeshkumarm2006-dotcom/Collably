'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessage } from '@/lib/types';

/**
 * Always-visible admin<->member (creator or business) chat panel for the two-pane
 * inbox. Fills the right pane: a scrolling message timeline plus a composer that
 * sends text and images. Data is self-contained: the thread is fetched on mount,
 * polled while open, and refetched after each send, so no socket is needed. All
 * calls go through same-origin proxies (`/api/creators/:id/messages` or
 * `/api/businesses/:id/messages`, chosen by `memberType`, plus `/api/upload/sign`)
 * — the browser never touches the backend or Cloudinary secret directly.
 */

/** Signed params returned by `POST /api/upload/sign` (mirrors the backend shape). */
type SignedUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
};

const POLL_MS = 8000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB guard before we hit Cloudinary.

/** Only allow http(s) image URLs through to <img src>; block javascript:/data: etc. */
function safeImageSrc(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function InboxThread({
  id,
  name,
  memberType = 'creator',
}: {
  /** CreatorProfile id (memberType 'creator') or BusinessProfile id ('business'). */
  id: string;
  name: string;
  memberType?: 'creator' | 'business';
}) {
  const basePath = `/api/${memberType === 'business' ? 'businesses' : 'creators'}/${id}/messages`;
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Image staged for sending: uploaded to Cloudinary on pick, but only sent when
  // the admin clicks Send (optionally with a caption). null = nothing staged.
  const [stagedImage, setStagedImage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch(basePath, { cache: 'no-store' });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Could not load messages (${res.status})`);
        }
        const data = (await res.json()) as { messages?: AdminMessage[] };
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setError(null);
      } catch (e) {
        // Don't clobber the view on a background poll failure; surface load errors.
        if (!opts?.silent) setError((e as Error).message);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [basePath],
  );

  // Fetch on mount / when the selected member changes.
  useEffect(() => {
    void load();
  }, [load]);

  // Poll for new creator replies while the thread is open.
  useEffect(() => {
    const id = setInterval(() => void load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Keep the latest message in view as the thread grows.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (payload: { body?: string; imageUrl?: string }) => {
      const res = await fetch(basePath, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Could not send (${res.status})`);
      }
      const raw = (await res.json()) as { message?: AdminMessage } | AdminMessage;
      const created = (raw as { message?: AdminMessage }).message ?? (raw as AdminMessage);
      if (created && created._id) setMessages((prev) => [...prev, created]);
    },
    [basePath],
  );

  async function send() {
    const body = draft.trim();
    if ((!body && !stagedImage) || sending || uploading) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({
        ...(body ? { body } : {}),
        ...(stagedImage ? { imageUrl: stagedImage } : {}),
      });
      setDraft('');
      setStagedImage(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  /**
   * Upload the picked image straight to Cloudinary using signed params, then send
   * a message carrying the resulting secure_url. Mirrors the mobile app's
   * multipart shape (file, api_key, timestamp, folder, signature).
   */
  async function onPickImage(file: File) {
    if (uploading || sending) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image is too large (max 10MB).');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      // 1. Signed params from our backend (secret stays server-side).
      const signRes = await fetch('/api/upload/sign', { method: 'POST' });
      if (!signRes.ok) {
        const data = (await signRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Could not prepare upload (${signRes.status})`);
      }
      const signed = (await signRes.json()) as SignedUpload;

      // 2. Multipart POST directly to Cloudinary with the signed fields.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('folder', signed.folder);
      form.append('signature', signed.signature);

      const upRes = await fetch(signed.uploadUrl, { method: 'POST', body: form });
      if (!upRes.ok) {
        const detail = await upRes.text().catch(() => '');
        throw new Error(`Image upload failed (${upRes.status})${detail ? `: ${detail}` : ''}`);
      }
      const json = (await upRes.json()) as { secure_url?: string };
      if (!json.secure_url) throw new Error('Cloudinary did not return a secure_url.');

      // 3. Stage the hosted image for a preview. It is sent when the admin clicks
      // Send (so they can add a caption first), not automatically on upload.
      setStagedImage(json.secure_url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const busy = sending || uploading;
  const canSend = (draft.trim().length > 0 || !!stagedImage) && !busy;

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={`Chat with ${name}`}>
      {/* Thread header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-hair px-5 py-3.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[linear-gradient(150deg,#2D88FF,#1877F2)] text-sm font-extrabold text-white"
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase() || '?'}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-extrabold tracking-tight text-ink">
            {name}
          </h2>
          <p className="text-[12px] font-semibold text-faint">Support conversation</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto rounded-md border border-hair bg-white px-3 py-1.5 text-[13px] font-semibold text-muted transition hover:text-ink disabled:opacity-50"
        >
          Refresh
        </button>
      </header>

      {/* Timeline */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto bg-elev px-5 py-4"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? (
          <p className="m-auto text-sm text-faint">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="m-auto max-w-xs px-2 text-center text-sm text-faint">
            No messages yet. Send the first one to {name}.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === 'admin';
            const img = safeImageSrc(m.imageUrl);
            return (
              <div
                key={m._id}
                className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-card ${
                  mine
                    ? 'self-end bg-brand text-white'
                    : 'self-start border border-hair bg-white text-ink'
                }`}
              >
                {img && (
                  <a href={img} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt="Shared attachment"
                      className="max-w-[240px] rounded-lg"
                      loading="lazy"
                    />
                  </a>
                )}
                {m.body?.trim() && (
                  <p className={`whitespace-pre-wrap break-words ${img ? 'mt-2' : ''}`}>{m.body}</p>
                )}
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

      {/* Composer */}
      <div className="shrink-0 border-t border-hair bg-card px-5 py-3">
        {error && (
          <p className="mb-2 text-[13px] font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
        {stagedImage && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-hair bg-elev p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stagedImage} alt="Attachment preview" className="h-14 w-14 rounded-md object-cover" />
            <button
              type="button"
              onClick={() => setStagedImage(null)}
              disabled={sending}
              aria-label="Remove image"
              className="grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white transition hover:bg-ink disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPickImage(file);
              e.target.value = ''; // allow re-picking the same file
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Attach an image"
            title="Attach an image"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-hair bg-white text-muted transition hover:text-ink disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={`Message ${name}…`}
            rows={1}
            aria-label={`Message ${name}`}
            className="max-h-32 min-h-[40px] w-full resize-none rounded-lg border border-hair bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="h-10 shrink-0 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {uploading && (
          <p className="mt-2 text-[13px] font-semibold text-muted" role="status">
            Uploading image…
          </p>
        )}
      </div>
    </section>
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
