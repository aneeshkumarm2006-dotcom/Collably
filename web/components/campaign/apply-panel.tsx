'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Lock } from 'lucide-react';

import { clientApi } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { useApplyToCampaign } from '@/lib/api/queries/campaigns';
import { useAuth } from '@/components/providers/auth-provider';
import { track } from '@/lib/analytics';
import { toast } from '@/lib/toast';
import type { ApplicationStatus } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type ApplyViewerRole = 'guest' | 'creator' | 'business' | 'admin';

export interface ApplyPanelProps {
  campaignId: string;
  campaignTitle: string;
  /** Campaign is Active and accepting applications. */
  isActive: boolean;
}

/**
 * The apply call-to-action on a public campaign detail, with all states:
 * Closed · Sign up to apply (guest) · under-review (unapproved creator) ·
 * Apply (opens a pitch dialog) · Applied (already submitted).
 * Businesses/admins see a neutral note.
 *
 * The viewer's role + approval come from the client `AuthProvider` (the campaign
 * page itself is statically cached / ISR'd and reads no session), so this panel
 * shows a brief neutral "loading" state until the session probe resolves.
 */
export function ApplyPanel({ campaignId, campaignTitle, isActive }: ApplyPanelProps) {
  const { user, isLoading } = useAuth();
  const role: ApplyViewerRole = user ? (user.role as ApplyViewerRole) : 'guest';
  const approved = user?.approved ?? false;
  const isCreator = role === 'creator';

  // Detect an existing application for this campaign (creator only).
  const existing = useQuery({
    queryKey: queryKeys.applications.list({ campaignId }),
    queryFn: ({ signal }) => clientApi.applications.list({ campaignId }, signal),
    enabled: isCreator,
  });
  const myApplication = existing.data?.data?.[0];

  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState('');
  const apply = useApplyToCampaign();

  async function submit() {
    try {
      await apply.mutateAsync({ id: campaignId, pitch: pitch.trim() || undefined });
      track('campaign_apply', { campaignId });
      toast.success('Application submitted');
      setOpen(false);
      setPitch('');
      void existing.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit your application');
    }
  }

  // --- Closed ---
  if (!isActive) {
    return (
      <PanelShell>
        <Button disabled className="w-full" size="lg">
          Campaign closed
        </Button>
        <Note>This campaign isn’t accepting applications right now.</Note>
      </PanelShell>
    );
  }

  // --- Resolving the session (static/ISR page hydrating) ---
  if (isLoading) {
    return (
      <PanelShell>
        <Button disabled className="w-full" size="lg">
          <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
      </PanelShell>
    );
  }

  // --- Guest ---
  if (role === 'guest') {
    return (
      <PanelShell>
        <Button asChild className="w-full" size="lg">
          <Link href={`/login?next=/campaign/${campaignId}`}>
            <Lock className="h-4 w-4" /> Sign up to apply
          </Link>
        </Button>
        <Note>Free to apply · You’ll hear back within a few days</Note>
      </PanelShell>
    );
  }

  // --- Business / admin ---
  if (!isCreator) {
    return (
      <PanelShell>
        <Button disabled className="w-full" size="lg" variant="secondary">
          For creators
        </Button>
        <Note>You’re signed in as a business. Switch to a creator account to apply.</Note>
      </PanelShell>
    );
  }

  // --- Creator: already applied ---
  if (myApplication) {
    const status = myApplication.status as ApplicationStatus;
    return (
      <PanelShell>
        <Button disabled className="w-full" size="lg" variant="secondary">
          <Check className="h-4 w-4" /> Application submitted
        </Button>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
          Status <StatusBadge status={status} />
        </div>
      </PanelShell>
    );
  }

  // --- Creator: under review (not approved) ---
  if (!approved) {
    return (
      <PanelShell>
        <Button disabled className="w-full" size="lg">
          Apply now
        </Button>
        <Note>Your creator account is under review — you can apply once it’s verified.</Note>
      </PanelShell>
    );
  }

  // --- Creator: can apply ---
  return (
    <PanelShell>
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
        Apply now
      </Button>
      <Note>Free to apply · You’ll hear back within a few days</Note>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to this campaign</DialogTitle>
            <DialogDescription>
              Tell {campaignTitle ? 'them' : 'the brand'} why you’d be a great fit — your style, your
              audience, why this brand. They’ll see this with your profile.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            rows={5}
            placeholder="Your pitch (optional)…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={apply.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={apply.isPending}>
              {apply.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                'Submit application'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-center text-xs text-faint">{children}</p>;
}
