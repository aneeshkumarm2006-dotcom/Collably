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
          ? 'shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand transition hover:brightness-95 disabled:opacity-50'
          : 'shrink-0 rounded-full border border-hair bg-white px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-ink disabled:opacity-50'
      }
      title={verified ? 'Click to unverify this platform' : 'Mark this platform verified'}
    >
      {busy ? '…' : verified ? '✓ Verified' : 'Verify'}
    </button>
  );
}
