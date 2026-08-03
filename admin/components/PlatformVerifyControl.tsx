'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Per-platform verified toggle. Marks a single submitted handle (Instagram /
 * YouTube / TikTok) as verified or not, independent of the overall approval.
 * For Instagram this may already be true via the creator's DM-code flow.
 */
export function PlatformVerifyControl({
  id,
  platform,
  verified,
}: {
  id: string;
  platform: 'instagram' | 'youtube' | 'tiktok';
  verified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/creators/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platforms: { [platform]: !verified } }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={
        verified
          ? 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-brand-soft px-2.5 py-1 text-[11.5px] font-bold text-brand-deep transition hover:brightness-95 disabled:opacity-50'
          : 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-hair bg-white px-2.5 py-1 text-[11.5px] font-bold text-muted transition hover:border-faint hover:text-ink disabled:opacity-50'
      }
      title={verified ? 'Click to unverify this platform' : 'Mark this platform verified'}
    >
      {verified && !busy && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      )}
      {busy ? '…' : verified ? 'Verified' : 'Verify'}
    </button>
  );
}
