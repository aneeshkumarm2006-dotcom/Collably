'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ApproveControl({
  kind,
  id,
  isVerified,
}: {
  kind: 'creators' | 'businesses';
  id: string;
  isVerified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setVerified(value: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/${kind}/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isVerified: value }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {isVerified ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setVerified(false)}
          className="rounded-md border border-hair bg-white px-3.5 py-2 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Revoke'}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setVerified(true)}
          className="rounded-md bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Approve'}
        </button>
      )}
      {error && <span className="max-w-[160px] text-right text-xs text-danger">{error}</span>}
    </div>
  );
}
