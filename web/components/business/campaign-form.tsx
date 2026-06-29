'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Globe,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

import { useCreateCampaign, useUpdateCampaign } from '@/lib/api/queries';
import { errorMessage } from '@/lib/api/errors';
import { track } from '@/lib/analytics';
import { toast } from '@/lib/toast';
import { uploadToCloudinary } from '@/lib/upload/cloudinary';
import { CATEGORIES, PLATFORMS, CONTENT_TYPES, REWARD_TYPES } from '@/lib/constants';
import type { Category, ContentType, Platform, RewardType } from '@/lib/shared';
import { categoryIcon, rewardIcon } from '@/lib/domain-meta';
import {
  type CampaignForm as CampaignFormModel,
  type CampaignFormErrors,
  type DeliverableForm,
  DESCRIPTION_MAX,
  emptyDeliverable,
  hasErrors,
  MAX_DELIVERABLES,
  MAX_TAGS,
  REWARD_DESC_MAX,
  TAG_MAX_LEN,
  TITLE_MAX,
  toCampaignPayload,
  validateCampaignForm,
} from '@/lib/business/campaign-form';
import { cn } from '@/lib/utils';
import { ErrorBanner } from '@/components/auth/auth-layout';
import { SelectCard } from '@/components/onboarding/onboarding-ui';
import { LocationFields } from '@/components/shared/location-fields';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CAMPAIGNS_HREF = '/dashboard/business/campaigns';

// Code-split the map-based exact-pin editor: the Google Maps SDK loads only when
// a business actually opens the campaign form, not across the dashboard bundle.
const LocationPicker = dynamic(
  () => import('@/components/maps/location-picker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);

/** A titled card section with a numbered eyebrow (matches the design's sections). */
function Section({
  index,
  title,
  description,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hair bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-[12px] font-semibold text-faint">
          {String(index).padStart(2, '0')}
        </span>
        <h2 className="text-base font-bold text-ink">{title}</h2>
      </div>
      {description && <p className="mt-0.5 pl-7 text-[13px] text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[12.5px] text-danger">{message}</p>;
}

export function CampaignForm({
  mode,
  campaignId,
  initial,
  canPublish,
}: {
  mode: 'create' | 'edit';
  campaignId?: string;
  initial: CampaignFormModel;
  /** The business is verified; only then can it publish straight to Active. */
  canPublish: boolean;
}) {
  const router = useRouter();
  const create = useCreateCampaign();
  const update = useUpdateCampaign();

  const [form, setForm] = useState<CampaignFormModel>(initial);
  const [errors, setErrors] = useState<CampaignFormErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patch = (partial: Partial<CampaignFormModel>) => setForm((f) => ({ ...f, ...partial }));
  const patchReward = (partial: Partial<CampaignFormModel['reward']>) =>
    setForm((f) => ({ ...f, reward: { ...f.reward, ...partial } }));

  function setDeliverable(i: number, partial: Partial<DeliverableForm>) {
    setForm((f) => ({
      ...f,
      deliverables: f.deliverables.map((d, idx) => (idx === i ? { ...d, ...partial } : d)),
    }));
  }
  function addDeliverable() {
    setForm((f) =>
      f.deliverables.length >= MAX_DELIVERABLES
        ? f
        : { ...f, deliverables: [...f.deliverables, emptyDeliverable()] },
    );
  }
  function removeDeliverable(i: number) {
    setForm((f) => ({ ...f, deliverables: f.deliverables.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(publish: boolean) {
    const errs = validateCampaignForm(form);
    setErrors(errs);
    if (hasErrors(errs)) {
      setBanner('Please fix the highlighted fields before saving.');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBanner(null);
    setSubmitting(true);
    try {
      const payload = toCampaignPayload(form);
      if (mode === 'create') {
        await create.mutateAsync({ ...payload, status: publish ? 'Active' : 'Draft' });
        if (publish) track('campaign_published', { category: payload.category });
        toast.success(publish ? 'Campaign published' : 'Draft saved');
      } else {
        await update.mutateAsync({ id: campaignId as string, input: payload });
        toast.success('Campaign updated');
      }
      router.push(CAMPAIGNS_HREF);
      router.refresh();
    } catch (err) {
      const message = errorMessage(err);
      setBanner(message);
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {banner && <ErrorBanner message={banner} />}

      {/* 01: Basics */}
      <Section index={1} title="Basics" description="The headline creators see first.">
        <div className="space-y-1.5">
          <Label htmlFor="title">Campaign title</Label>
          <Input
            id="title"
            value={form.title}
            maxLength={TITLE_MAX}
            placeholder="e.g. Spring Tasting Menu: Reel Collab"
            aria-invalid={!!errors.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <FieldError message={errors.title} />
        </div>

        <div className="mt-5">
          <Label>Category</Label>
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {CATEGORIES.map((c: Category) => (
              <SelectCard
                key={c}
                label={c}
                icon={categoryIcon(c)}
                selected={form.category === c}
                onClick={() => patch({ category: c })}
              />
            ))}
          </div>
          <FieldError message={errors.category} />
        </div>

        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
            <span className="font-mono text-[11px] text-faint">
              {form.description.length} / {DESCRIPTION_MAX}
            </span>
          </div>
          <Textarea
            id="description"
            value={form.description}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            placeholder="Describe the experience, what makes it special, and what you're looking for…"
            aria-invalid={!!errors.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
          <FieldError message={errors.description} />
        </div>
      </Section>

      {/* 02: Cover image */}
      <Section index={2} title="Cover image" description="A 16:9 image shown on the campaign card and detail page.">
        <CoverUploader value={form.coverImage} onChange={(coverImage) => patch({ coverImage })} />
      </Section>

      {/* 03: Location */}
      <Section index={3} title="Location" description="Where the collab happens.">
        <div className="inline-flex rounded-lg border border-hair p-1">
          <button
            type="button"
            onClick={() => patch({ isRemote: false })}
            aria-pressed={!form.isRemote}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              !form.isRemote ? 'bg-brand text-white' : 'text-muted hover:text-ink',
            )}
          >
            <MapPin className="h-4 w-4" /> In-person
          </button>
          <button
            type="button"
            onClick={() => patch({ isRemote: true })}
            aria-pressed={form.isRemote}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              form.isRemote ? 'bg-brand text-white' : 'text-muted hover:text-ink',
            )}
          >
            <Globe className="h-4 w-4" /> Remote / Online
          </button>
        </div>
        {!form.isRemote && (
          <div className="mt-4 space-y-5">
            <LocationFields value={form.location} onChange={(location) => patch({ location })} />
            <div>
              <Label>Pin the exact spot (optional)</Label>
              <p className="mb-3 mt-0.5 text-[13px] text-muted">
                Accepted creators see the precise address; everyone else sees an approximate area.
              </p>
              <LocationPicker
                value={form.locationPin}
                onChange={(locationPin) => patch({ locationPin })}
                cityHint={[form.location.city, form.location.state].filter(Boolean).join(', ')}
              />
            </div>
          </div>
        )}
      </Section>

      {/* 04: Reward */}
      <Section index={4} title="Reward" description="What the creator gets in exchange for content.">
        <Label>Reward type</Label>
        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {REWARD_TYPES.map((t: RewardType) => (
            <SelectCard
              key={t}
              label={t === 'Cash+Product' ? 'Cash + Product' : t}
              icon={rewardIcon(t)}
              selected={form.reward.type === t}
              onClick={() => patchReward({ type: t })}
            />
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_200px]">
          <div className="space-y-1.5">
            <Label htmlFor="reward-desc">Reward description</Label>
            <Input
              id="reward-desc"
              value={form.reward.description}
              maxLength={REWARD_DESC_MAX}
              placeholder="e.g. Tasting menu for 2 with paired mocktails"
              aria-invalid={!!errors.rewardDescription}
              onChange={(e) => patchReward({ description: e.target.value })}
            />
            <FieldError message={errors.rewardDescription} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reward-value">Estimated value</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
                $
              </span>
              <Input
                id="reward-value"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.reward.estimatedValue}
                placeholder="140"
                className="pl-7"
                aria-invalid={!!errors.estimatedValue}
                onChange={(e) => patchReward({ estimatedValue: e.target.value })}
              />
            </div>
            <FieldError message={errors.estimatedValue} />
          </div>
        </div>
      </Section>

      {/* 05: Deliverables */}
      <Section index={5} title="Deliverables" description="What the creator needs to post.">
        <div className="space-y-4">
          {form.deliverables.map((d, i) => (
            <DeliverableEditor
              key={i}
              index={i}
              value={d}
              canRemove={form.deliverables.length > 1}
              onChange={(partial) => setDeliverable(i, partial)}
              onRemove={() => removeDeliverable(i)}
            />
          ))}
        </div>
        <FieldError message={errors.deliverables} />
        {form.deliverables.length < MAX_DELIVERABLES && (
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addDeliverable}>
            <Plus className="h-4 w-4" /> Add another deliverable
          </Button>
        )}
      </Section>

      {/* 06: Settings */}
      <Section index={6} title="Settings" description="Deadline and audience requirements.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => patch({ deadline: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-followers">Min. followers</Label>
            <Input
              id="min-followers"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.minFollowers}
              placeholder="0"
              aria-invalid={!!errors.minFollowers}
              onChange={(e) => patch({ minFollowers: e.target.value })}
            />
            <p className="text-[12px] text-faint">Set 0 to accept all creators (incl. UGC).</p>
            <FieldError message={errors.minFollowers} />
          </div>
        </div>
      </Section>

      {/* 07: Tags */}
      <Section index={7} title="Tags" description="Help creators discover this campaign.">
        <TagEditor tags={form.tags} onChange={(tags) => patch({ tags })} />
      </Section>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center justify-end gap-3 border-t border-hair bg-card/90 px-5 py-3.5 backdrop-blur sm:-mx-6 sm:px-6">
        {mode === 'create' && !canPublish && (
          <p className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-muted">
            <Clock className="h-3.5 w-3.5 text-warn" /> Publishing unlocks once an admin verifies your
            business.
          </p>
        )}
        <Button variant="outline" disabled={submitting} onClick={() => router.push(CAMPAIGNS_HREF)}>
          Cancel
        </Button>
        {mode === 'create' ? (
          <>
            <Button variant="secondary" disabled={submitting} onClick={() => handleSubmit(false)}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as draft'}
            </Button>
            <Button disabled={submitting || !canPublish} onClick={() => handleSubmit(true)}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish campaign'}
            </Button>
          </>
        ) : (
          <Button size="lg" disabled={submitting} onClick={() => handleSubmit(false)}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/** 16:9 cover image picker that uploads straight to Cloudinary (`campaigns` folder). */
function CoverUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'campaigns');
      onChange(url);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not upload that image'));
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-hair bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied cover preview */}
          <img src={value} alt="Campaign cover" className="h-full w-full object-cover" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <RefreshCw className="h-4 w-4" /> Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <label
      className={cn(
        'flex aspect-video w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-hair-strong bg-secondary text-center transition-colors hover:border-brand',
        uploading && 'pointer-events-none opacity-60',
      )}
    >
      <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-card text-brand shadow-xs">
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
      </span>
      <span className="text-sm font-semibold text-ink">
        {uploading ? 'Uploading…' : 'Click to upload a cover'}
      </span>
      <span className="mt-0.5 text-xs text-faint">PNG or JPG up to 10MB · 16:9 recommended</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function DeliverableEditor({
  index,
  value,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  value: DeliverableForm;
  canRemove: boolean;
  onChange: (partial: Partial<DeliverableForm>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-hair bg-secondary/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-faint">
          Deliverable {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove deliverable"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_88px]">
        <div className="space-y-1.5">
          <Label className="text-xs">Platform</Label>
          <Select value={value.platform} onValueChange={(v) => onChange({ platform: v as Platform })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Content type</Label>
          <Select
            value={value.contentType}
            onValueChange={(v) => onChange({ contentType: v as ContentType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Qty</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={value.quantity}
            onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label className="text-xs">Requirements</Label>
        <Textarea
          value={value.requirements}
          maxLength={1000}
          rows={2}
          placeholder="e.g. Tag @yourbrand, use #hashtag, post within 7 days…"
          onChange={(e) => onChange({ requirements: e.target.value })}
        />
      </div>
    </div>
  );
}

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim().replace(/^#/, '').slice(0, TAG_MAX_LEN);
    if (!value) return;
    if (tags.length >= MAX_TAGS) {
      toast.error(`You can add up to ${MAX_TAGS} tags.`);
      return;
    }
    if (!tags.some((t) => t.toLowerCase() === value.toLowerCase())) onChange([...tags, value]);
    setDraft('');
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 font-mono text-[12px] text-brand"
            >
              #{t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="text-brand/70 hover:text-brand"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        maxLength={TAG_MAX_LEN + 1}
        placeholder="Add a tag and press Enter…"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
      />
    </div>
  );
}
