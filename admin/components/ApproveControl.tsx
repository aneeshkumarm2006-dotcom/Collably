'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Verification controls for a creator/business row.
 *  - Pending: **Approve** (verify) or, for creators, **Reject** (decline with a
 *    reason the creator is notified about).
 *  - Verified: **Revoke**.
 * The reason box only appears for creator rejections.
 */
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
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/${kind}/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setRejecting(false);
      setReason('');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Reason box (creator rejection).
  if (rejecting) {
    const canSend = reason.trim().length > 0 && !busy;
    return (
      <div className="flex w-64 flex-col items-stretch gap-2">
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you rejecting? (e.g. Instagram handle doesn't match the link.) The creator sees this."
          rows={3}
          className="w-full resize-none rounded-md border border-hair bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRejecting(false);
              setReason('');
              setError(null);
            }}
            className="rounded-md border border-hair bg-white px-3 py-1.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => patch({ rejectionReason: reason.trim() })}
            className="rounded-md bg-danger px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send rejection'}
          </button>
        </div>
        {error && <span className="text-right text-xs text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {isVerified ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ isVerified: false })}
          className="rounded-md border border-hair bg-white px-3.5 py-2 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Revoke'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {kind === 'creators' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRejecting(true);
                setError(null);
              }}
              className="rounded-md border border-danger/40 bg-white px-3.5 py-2 text-sm font-semibold text-danger transition hover:bg-danger/5 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ isVerified: true })}
            className="rounded-md bg-brand px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Approve'}
          </button>
        </div>
      )}
      {error && <span className="max-w-[160px] text-right text-xs text-danger">{error}</span>}
    </div>
  );
}
