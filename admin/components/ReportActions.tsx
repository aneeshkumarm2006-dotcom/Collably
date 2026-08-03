'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Resolve controls for an open report: **Dismiss** (no action needed) or **Mark
 * actioned** (handled). Both PATCH the same-origin proxy then refresh the server
 * component so the report moves to its resolved bucket. Only rendered for open
 * reports, so there is nothing to show once resolved.
 */
export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | 'dismissed' | 'actioned'>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(status: 'dismissed' | 'actioned') {
    if (busy) return;
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => resolve('dismissed')}
          className="rounded-lg border border-hair bg-white px-4 py-2 text-[13px] font-bold text-muted transition hover:border-faint hover:text-ink disabled:opacity-50"
        >
          {busy === 'dismissed' ? 'Saving…' : 'Dismiss'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => resolve('actioned')}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(24,119,242,0.28)] transition hover:brightness-105 disabled:opacity-50"
        >
          {busy === 'actioned' ? 'Saving…' : 'Mark actioned'}
        </button>
      </div>
      {error && <span className="max-w-[200px] text-right text-xs text-danger">{error}</span>}
    </div>
  );
}
