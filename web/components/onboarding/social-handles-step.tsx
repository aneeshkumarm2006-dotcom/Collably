'use client';

import { AlertTriangle, BadgeCheck, Instagram, Music2, Youtube } from 'lucide-react';

import type { CreatorForm } from '@/lib/onboarding/creator';
import { digits, platformStarted, platformValid } from '@/lib/onboarding/creator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type Social = CreatorForm['social'];

/**
 * Creator "Social handles" step (Phase 5). One connector card per platform.
 * Each takes a handle + a public profile link (required together; the backend
 * needs the link) plus follower/subscriber counts. A platform reads as
 * "Connected" once it has a handle + a valid link; an amber hint nudges for a
 * link when one's been started. The UGC toggle closes the step.
 *
 * At least one fully-connected platform is required to advance, enforced by the
 * caller via `hasOneSocial`.
 */
export function SocialHandlesStep({
  social,
  onSocialChange,
  isUGCOnly,
  onUGCChange,
}: {
  social: Social;
  onSocialChange: (partial: Partial<Social>) => void;
  isUGCOnly: boolean;
  onUGCChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <PlatformCard
        icon={<Instagram className="h-5 w-5" />}
        iconClass="bg-[#E1306C]"
        name="Instagram"
        sub="Photos, Reels & Stories"
        handle={social.igHandle}
        link={social.igLink}
        handlePlaceholder="@yourhandle"
        linkPlaceholder="https://instagram.com/yourhandle"
        onHandle={(igHandle) => onSocialChange({ igHandle })}
        onLink={(igLink) => onSocialChange({ igLink })}
        hintExample="instagram.com/you"
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Followers"
            value={social.igFollowers}
            placeholder="0"
            onChange={(v) => onSocialChange({ igFollowers: digits(v) })}
          />
          <NumberField
            label="Engagement %"
            value={social.igEngagement}
            placeholder="e.g. 3.5"
            onChange={(v) => onSocialChange({ igEngagement: v.replace(/[^0-9.]/g, '') })}
          />
        </div>
      </PlatformCard>

      <PlatformCard
        icon={<Youtube className="h-5 w-5" />}
        iconClass="bg-[#FF0000]"
        name="YouTube"
        sub="Long videos & Shorts"
        handle={social.ytHandle}
        link={social.ytLink}
        handlePlaceholder="Channel name"
        linkPlaceholder="https://youtube.com/@yourchannel"
        onHandle={(ytHandle) => onSocialChange({ ytHandle })}
        onLink={(ytLink) => onSocialChange({ ytLink })}
        hintExample="youtube.com/@you"
      >
        <NumberField
          label="Subscribers"
          value={social.ytSubs}
          placeholder="0"
          onChange={(v) => onSocialChange({ ytSubs: digits(v) })}
        />
      </PlatformCard>

      <PlatformCard
        icon={<Music2 className="h-5 w-5" />}
        iconClass="bg-ink"
        name="TikTok"
        sub="Short-form video"
        handle={social.ttHandle}
        link={social.ttLink}
        handlePlaceholder="@yourhandle"
        linkPlaceholder="https://tiktok.com/@yourhandle"
        onHandle={(ttHandle) => onSocialChange({ ttHandle })}
        onLink={(ttLink) => onSocialChange({ ttLink })}
        hintExample="tiktok.com/@you"
      >
        <NumberField
          label="Followers"
          value={social.ttFollowers}
          placeholder="0"
          onChange={(v) => onSocialChange({ ttFollowers: digits(v) })}
        />
      </PlatformCard>

      <label className="flex cursor-pointer items-center gap-3 rounded-md bg-secondary p-4">
        <Switch checked={isUGCOnly} onCheckedChange={onUGCChange} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink">I&apos;m a UGC creator</span>
          <span className="mt-0.5 block text-xs text-muted">
            I create content for brands without a large public following.
          </span>
        </span>
      </label>
    </div>
  );
}

function PlatformCard({
  icon,
  iconClass,
  name,
  sub,
  handle,
  link,
  handlePlaceholder,
  linkPlaceholder,
  onHandle,
  onLink,
  hintExample,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  name: string;
  sub: string;
  handle: string;
  link: string;
  handlePlaceholder: string;
  linkPlaceholder: string;
  onHandle: (v: string) => void;
  onLink: (v: string) => void;
  hintExample: string;
  children: React.ReactNode;
}) {
  const complete = platformValid(handle, link);
  const needsLink = platformStarted(handle, link) && !complete;
  const fieldId = `social-${name.toLowerCase()}`;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        complete ? 'border-brand bg-brand-soft' : 'border-hair bg-card',
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-md text-white', iconClass)}>
          {icon}
        </span>
        <div className="flex-1">
          <p className="text-[15px] font-bold text-ink">{name}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        {complete && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11.5px] font-semibold text-success">
            <BadgeCheck className="h-3.5 w-3.5" /> Connected
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-handle`}>Handle</Label>
          <Input
            id={`${fieldId}-handle`}
            value={handle}
            maxLength={120}
            autoComplete="off"
            placeholder={handlePlaceholder}
            onChange={(e) => onHandle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-link`}>Profile link</Label>
          <Input
            id={`${fieldId}-link`}
            type="url"
            inputMode="url"
            value={link}
            maxLength={2048}
            autoComplete="off"
            placeholder={linkPlaceholder}
            aria-invalid={needsLink}
            onChange={(e) => onLink(e.target.value)}
          />
        </div>
        {children}
        {needsLink && (
          <p className="flex items-center gap-1.5 text-[12.5px] text-warn">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Add a valid profile link (e.g. {hintExample}).
          </p>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const id = `num-${label.toLowerCase().replace(/[^a-z]/g, '')}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
