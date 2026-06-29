'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, ClipboardCheck, ExternalLink, RotateCcw, SearchX, X } from 'lucide-react';

import { useApplications, useVerifySubmission } from '@/lib/api/queries';
import { toast } from '@/lib/toast';
import { errorMessage } from '@/lib/api/errors';
import type { PublicApplication } from '@/lib/api/types';
import { applicantView } from '@/lib/business/applicant';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { Avatar } from '@/components/shared/avatar';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BusinessSubmissionsClient() {
  const query = useApplications({ status: 'Accepted', limit: 100 });
  const [proof, setProof] = useState<string | null>(null);

  // The review queue = accepted collabs that have submitted content.
  const submissions = useMemo(
    () => (query.data?.data ?? []).filter((a) => Boolean(a.submittedAt)),
    [query.data],
  );

  return (
    <>
      {query.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={<SearchX />}
          title="Couldn’t load submissions"
          description="Something went wrong. Please try again."
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              Retry
            </Button>
          }
        />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title="Nothing to review"
          description="When an accepted creator submits their content, it lands here for you to verify."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((app) => (
            <SubmissionCard key={app._id} app={app} onViewProof={setProof} />
          ))}
        </div>
      )}

      <Dialog open={proof !== null} onOpenChange={(open) => !open && setProof(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Proof screenshot</DialogTitle>
          </DialogHeader>
          {proof && (
            <div className="relative max-h-[70vh] overflow-auto rounded-md border border-hair">
              {/* eslint-disable-next-line @next/next/no-img-element -- full-size proof view */}
              <img src={proof} alt="Submission proof" className="h-auto w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubmissionCard({
  app,
  onViewProof,
}: {
  app: PublicApplication;
  onViewProof: (url: string) => void;
}) {
  const verify = useVerifySubmission();
  const view = applicantView(app);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [note, setNote] = useState('');

  async function act(action: 'verify' | 'revision' | 'fail') {
    try {
      await verify.mutateAsync({
        id: app._id,
        input: { action, note: note.trim() || undefined },
      });
      toast.success(
        action === 'verify'
          ? 'Submission verified — collab completed 🎉'
          : action === 'revision'
            ? 'Revision requested'
            : 'Submission marked as failed',
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the submission'));
    }
  }

  const busy = verify.isPending;

  return (
    <div className="rounded-lg border border-hair bg-card p-5 shadow-sm">
      {/* Head */}
      <div className="flex flex-wrap items-start gap-3.5">
        <Avatar name={view.name} src={view.avatar} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-ink">{view.name}</h3>
            {view.handle && <span className="text-[13px] text-muted">{view.handle}</span>}
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {app.campaign?.title ? `“${app.campaign.title}”` : 'Campaign'}
          </p>
          {app.submittedAt && (
            <p className="mt-0.5 text-[12px] text-faint">
              Submitted {formatDate(app.submittedAt)} · {formatRelativeTime(app.submittedAt)}
            </p>
          )}
        </div>
        <StatusBadge status="Under review" className="shrink-0" />
      </div>

      {/* Proof + live post */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {app.submissionProof && (
          <button
            type="button"
            onClick={() => onViewProof(app.submissionProof as string)}
            className="relative h-[88px] w-[130px] shrink-0 overflow-hidden rounded-md border border-hair transition-opacity hover:opacity-90"
          >
            <Image src={app.submissionProof} alt="Submission proof" fill sizes="130px" className="object-cover" />
          </button>
        )}
        {app.submissionLink && (
          <Button asChild variant="outline" size="sm">
            <a href={app.submissionLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> View live post
            </a>
          </Button>
        )}
      </div>

      {/* Creator note */}
      {app.submissionNote && (
        <div className="mt-4 rounded-md bg-secondary px-3.5 py-3 text-sm text-muted">
          <span className="font-semibold text-ink">Creator note: </span>
          {app.submissionNote}
        </div>
      )}

      {/* Revision box */}
      {revisionOpen && (
        <div className="mt-4 rounded-md border border-warn/30 bg-warn-soft p-3.5">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What needs to change? Be specific so the creator can fix it quickly…"
            className="bg-card"
          />
          <div className="mt-2.5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRevisionOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={() => act('revision')}>
              Send revision request
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hair pt-4">
        <Button size="sm" disabled={busy} onClick={() => act('verify')}>
          <Check className="h-4 w-4" /> Mark verified
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-warn hover:text-warn"
          disabled={busy}
          onClick={() => setRevisionOpen((o) => !o)}
        >
          <RotateCcw className="h-4 w-4" /> Request revision
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:text-danger"
          disabled={busy}
          onClick={() => act('fail')}
        >
          <X className="h-4 w-4" /> Mark failed
        </Button>
      </div>
    </div>
  );
}
