'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  X,
} from 'lucide-react';

import type { PublicApplication } from '@/lib/api/types';
import { useSubmitContent } from '@/lib/api/queries';
import { errorMessage } from '@/lib/api/errors';
import { toast } from '@/lib/toast';
import { looksLikeUrl, normalizeUrl } from '@/lib/onboarding/creator';
import { uploadToCloudinary } from '@/lib/upload/cloudinary';
import { deadlineUrgency, formatDate, formatCountdown } from '@/lib/format';
import { deliverableLabel } from '@/components/creator/creator-collab-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const BACK_HREF = '/dashboard/creator/collabs';

/** Centered status panel for the non-submittable + success states. */
function StatePanel({
  icon,
  title,
  message,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hair bg-card p-8 text-center shadow-card">
      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success animate-in zoom-in-50 [&_svg]:h-8 [&_svg]:w-8">
        {icon}
      </div>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

export function SubmitContentClient({ application }: { application: PublicApplication }) {
  const submit = useSubmitContent();
  const campaign = application.campaign;
  const deliverables = campaign?.deliverables ?? [];

  const [link, setLink] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [linkTouched, setLinkTouched] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit = application.status === 'Accepted' || application.status === 'Overdue';
  const alreadySubmitted = canSubmit && Boolean(application.submittedAt);
  const linkValid = looksLikeUrl(link);

  // --- Success ---
  if (success) {
    return (
      <StatePanel
        icon={<CheckCircle2 />}
        title="Submission received!"
        message={`${campaign?.business?.businessName ?? 'The brand'} will review your content shortly. You'll be notified once it's verified.`}
      >
        <Button asChild>
          <Link href={BACK_HREF}>
            <ArrowLeft className="h-4 w-4" /> Back to collabs
          </Link>
        </Button>
      </StatePanel>
    );
  }

  // --- Not in a submittable state ---
  if (!canSubmit) {
    return (
      <StatePanel
        icon={<AlertTriangle />}
        title="Nothing to submit here"
        message="This collab isn't awaiting a submission right now."
      >
        <Button asChild variant="outline">
          <Link href={BACK_HREF}>Back to collabs</Link>
        </Button>
      </StatePanel>
    );
  }

  // --- Already submitted (awaiting review) ---
  if (alreadySubmitted) {
    return (
      <StatePanel
        icon={<CheckCircle2 />}
        title="Already submitted"
        message={`Your content is in for review. ${campaign?.business?.businessName ?? 'The brand'} will verify it soon.`}
      >
        {application.submissionLink && (
          <Button asChild variant="outline">
            <a href={application.submissionLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> View submission
            </a>
          </Button>
        )}
        <Button asChild>
          <Link href={BACK_HREF}>Back to collabs</Link>
        </Button>
      </StatePanel>
    );
  }

  async function handleProof(file: File | undefined) {
    if (!file) return;
    setProofUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'submissions');
      setProofUrl(url);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not upload that screenshot'));
    } finally {
      setProofUploading(false);
    }
  }

  async function onSubmit() {
    setLinkTouched(true);
    if (!linkValid || !confirmed) return;
    try {
      await submit.mutateAsync({
        id: application._id,
        input: {
          submissionLink: normalizeUrl(link),
          submissionProof: proofUrl ?? undefined,
          submissionNote: note.trim() || undefined,
        },
      });
      setSuccess(true);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not submit your content'));
    }
  }

  const urgency = campaign?.deadline ? deadlineUrgency(campaign.deadline) : 'normal';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Submit your content</h1>
        <p className="mt-1 text-sm text-muted">Add proof of your work, then submit for review.</p>
      </div>

      {/* Context panel */}
      <div className="rounded-xl border border-hair bg-card p-5 shadow-sm">
        <h2 className="font-bold text-ink">{campaign?.title ?? 'Campaign'}</h2>
        <p className="text-[13px] text-muted">{campaign?.business?.businessName}</p>

        {deliverables.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-faint">
              Deliverables to submit
            </p>
            <ul className="space-y-1.5">
              {deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                  <span>{deliverableLabel(d)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {campaign?.deadline && (
          <div
            className={cn(
              'mt-4 flex items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium',
              urgency === 'danger'
                ? 'bg-danger-soft text-danger'
                : urgency === 'warn'
                  ? 'bg-warn-soft text-warn'
                  : 'bg-secondary text-muted',
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {formatCountdown(campaign.deadline)}, {formatDate(campaign.deadline)}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="rounded-xl border border-hair bg-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <Label htmlFor="submission-link">Live post link</Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="submission-link"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onBlur={() => setLinkTouched(true)}
              placeholder="https://instagram.com/reel/…"
              className="pl-9"
              aria-invalid={linkTouched && !linkValid}
            />
          </div>
          {linkTouched && !linkValid && (
            <p className="text-[12.5px] text-danger">Enter the public URL of your posted content.</p>
          )}
        </div>

        <div className="mt-5 space-y-1.5">
          <Label>Proof screenshot (optional)</Label>
          {proofUrl ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element -- proof preview */}
              <img
                src={proofUrl}
                alt="Submission proof"
                className="h-32 w-auto rounded-md border border-hair object-cover"
              />
              <button
                type="button"
                onClick={() => setProofUrl(null)}
                aria-label="Remove screenshot"
                className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(19,26,46,0.7)] text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-hair-strong bg-secondary px-6 py-6 text-center transition-colors hover:border-brand',
                proofUploading && 'pointer-events-none opacity-60',
              )}
            >
              {proofUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              ) : (
                <ImagePlus className="h-5 w-5 text-brand" />
              )}
              <span className="mt-1.5 text-[13px] font-medium text-ink">
                {proofUploading ? 'Uploading…' : 'Upload a screenshot'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={proofUploading}
                onChange={(e) => {
                  void handleProof(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="submission-note">Notes to the brand (optional)</Label>
          <Textarea
            id="submission-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Anything the brand should know about your post…"
          />
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md bg-secondary p-3.5">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(c) => setConfirmed(c === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-ink">
            I confirm my submission meets all the requirements from the brief.
          </span>
        </label>

        <Button
          size="lg"
          className="mt-5 w-full"
          onClick={onSubmit}
          disabled={!confirmed || !linkValid || submit.isPending}
        >
          {submit.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            'Submit proof →'
          )}
        </Button>
      </div>

      <div>
        <Button asChild variant="ghost">
          <Link href={BACK_HREF}>
            <ArrowLeft className="h-4 w-4" /> Back to collabs
          </Link>
        </Button>
      </div>
    </div>
  );
}
