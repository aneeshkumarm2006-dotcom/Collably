import { cache } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Calendar,
  ChevronRight,
  Globe,
  Instagram,
  MapPin,
  Megaphone,
  Music2,
  Star,
  Users,
  Youtube,
  type LucideIcon,
} from 'lucide-react';

import { publicApi } from '@/lib/api/public';
import { isApiError } from '@/lib/api/errors';
import type { PublicCampaign } from '@/lib/api/types';
import { toCampaignCardData } from '@/lib/campaign-card';
import { formatCountdown, formatRelativeTime, deadlineUrgency, formatCompactNumber } from '@/lib/format';
import { categoryEmoji, categoryGradient } from '@/lib/domain-meta';
import { buildMetadata, campaignJsonLd, breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import { Container } from '@/components/marketing/section';
import { RewardPill } from '@/components/shared/reward-pill';
import { StatusBadge } from '@/components/shared/status-badge';
import { Avatar } from '@/components/shared/avatar';
import { CampaignCard } from '@/components/shared/campaign-card';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';
import { ApplyPanel } from '@/components/campaign/apply-panel';
import { CampaignLocationMap } from '@/components/maps/campaign-location-map.lazy';

// Public, ISR-cached page — the apply state + (for accepted creators) precise
// location hydrate client-side; the cached shell shows the public projection.
// `generateStaticParams` (empty) opts the route into on-demand ISR: nothing is
// prerendered at build, but each id is rendered once and cached for `revalidate`.
export const revalidate = 120;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** Cached per-request fetch so generateMetadata + the page share one round-trip. */
const getCampaign = cache(async (id: string): Promise<PublicCampaign | null> => {
  try {
    const res = await publicApi.campaigns.get(id);
    return res.campaign;
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    return null;
  }
});

const PLATFORM_ICON: Record<string, LucideIcon> = {
  Instagram,
  YouTube: Youtube,
  TikTok: Music2,
  'Google Reviews': Star,
  Any: Globe,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) {
    return buildMetadata({ title: 'Campaign not found', description: '', path: `/campaign/${id}`, noIndex: true });
  }
  const businessName = campaign.business?.businessName;
  return buildMetadata({
    title: campaign.title,
    description:
      campaign.description.slice(0, 180) +
      (businessName ? ` — a collab from ${businessName} on Collably.` : ''),
    path: `/campaign/${id}`,
    image: campaign.coverImage ?? undefined,
    ogEyebrow: `Campaign · ${campaign.category}`,
    keywords: [campaign.category, campaign.reward.type, ...campaign.tags],
  });
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const business = campaign.business;
  const isActive = campaign.status === 'Active';
  const locationText = campaign.isRemote
    ? 'Remote / Online'
    : [campaign.location?.city, campaign.location?.state].filter(Boolean).join(', ') || 'On-site';

  // "More from this business" — other active campaigns by the same business.
  let otherCampaigns: PublicCampaign[] = [];
  if (business?._id) {
    try {
      const res = await publicApi.campaigns.list({
        businessId: business._id,
        status: 'Active',
        limit: 4,
      });
      otherCampaigns = res.data.filter((c) => c._id !== campaign._id).slice(0, 2);
    } catch {
      otherCampaigns = [];
    }
  }

  return (
    <div className="bg-page pb-16">
      <JsonLd
        data={[
          campaignJsonLd({
            id: campaign._id,
            title: campaign.title,
            description: campaign.description,
            category: campaign.category,
            rewardValue: campaign.reward.estimatedValue,
            deadline: campaign.deadline,
            active: isActive,
            businessName: business?.businessName,
            businessId: business?._id,
            image: campaign.coverImage ? absoluteUrl(campaign.coverImage) : null,
          }),
          breadcrumbJsonLd([
            { name: 'Explore', path: '/explore' },
            { name: campaign.category, path: `/explore?category=${encodeURIComponent(campaign.category)}` },
            { name: campaign.title, path: `/campaign/${campaign._id}` },
          ]),
        ]}
      />

      <Container className="pt-8" size="default">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-[13px] text-muted" aria-label="Breadcrumb">
          <Link href="/explore" className="hover:text-brand">
            Explore
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-faint" />
          <Link
            href={`/explore?category=${encodeURIComponent(campaign.category)}`}
            className="hover:text-brand"
          >
            {campaign.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-faint" />
          <span className="truncate text-ink">{campaign.title}</span>
        </nav>

        <div className="grid gap-9 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* LEFT */}
          <div>
            {/* Cover */}
            <div
              className="relative aspect-video w-full overflow-hidden rounded-xl"
              style={{ background: categoryGradient(campaign.category) }}
            >
              {campaign.coverImage ? (
                <Image
                  src={campaign.coverImage}
                  alt={campaign.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 760px"
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-5xl opacity-90">
                  {categoryEmoji(campaign.category)}
                </span>
              )}
            </div>

            {/* Business card */}
            {business && (
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-hair bg-card p-4">
                <Avatar name={business.businessName} src={business.logo} size={48} shape="square" />
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{business.businessName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted">
                    {business.isVerified && <StatusBadge status="Verified" />}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {locationText}
                    </span>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
                  <Link href={`/business/${business._id}`}>Visit profile →</Link>
                </Button>
              </div>
            )}

            {/* About */}
            <section className="mt-9">
              <h2 className="mb-3 text-xl font-bold text-ink">About this campaign</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted">
                {campaign.description}
              </p>
            </section>

            {/* Deliverables */}
            {campaign.deliverables.length > 0 && (
              <section className="mt-9">
                <h2 className="mb-3 text-xl font-bold text-ink">What you need to create</h2>
                <div className="flex flex-col gap-3">
                  {campaign.deliverables.map((d, i) => {
                    const Icon = PLATFORM_ICON[d.platform] ?? Megaphone;
                    return (
                      <div key={i} className="rounded-lg border border-hair bg-card p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand">
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="font-semibold text-ink">
                            {d.platform} {d.contentType}
                          </span>
                          <span className="ml-auto font-mono text-[13px] text-muted">
                            {d.quantity}×
                          </span>
                        </div>
                        {d.requirements && (
                          <p className="mt-2.5 pl-12 text-[13px] leading-relaxed text-muted">
                            {d.requirements}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tags */}
            {campaign.tags.length > 0 && (
              <section className="mt-9">
                <h2 className="mb-3 text-xl font-bold text-ink">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {campaign.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-hair bg-card px-3 py-1 font-mono text-[12px] text-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Location (omitted for remote campaigns) */}
            {!campaign.isRemote && campaign.location && (
              <section className="mt-9">
                <h2 className="mb-3 text-xl font-bold text-ink">Location</h2>
                <CampaignLocationMap location={campaign.location} />
              </section>
            )}
          </div>

          {/* RIGHT — sticky apply card */}
          <aside className="lg:sticky lg:top-[84px]">
            <div className="rounded-xl border border-hair bg-card p-6 shadow-card">
              <h1 className="text-xl font-bold leading-snug tracking-tight text-ink">
                {campaign.title}
              </h1>
              <div className="mt-4">
                <RewardPill reward={campaign.reward} size="lg" />
              </div>

              <dl className="mt-4 divide-y divide-hair">
                <Row label={<StatusBadge status={campaign.status} />}>
                  <span className="font-mono text-[13px] text-muted">
                    Posted {formatRelativeTime(campaign.createdAt)}
                  </span>
                </Row>
                <Row
                  label={
                    <span className="flex items-center gap-2">
                      <Calendar className="h-[15px] w-[15px]" /> Deadline
                    </span>
                  }
                >
                  <span
                    className={`text-sm font-semibold ${
                      deadlineUrgency(campaign.deadline) === 'warn'
                        ? 'text-warn'
                        : deadlineUrgency(campaign.deadline) === 'danger'
                          ? 'text-danger'
                          : 'text-ink'
                    }`}
                  >
                    {formatCountdown(campaign.deadline)}
                  </span>
                </Row>
                <Row
                  label={
                    <span className="flex items-center gap-2">
                      <Users className="h-[15px] w-[15px]" /> Applicants
                    </span>
                  }
                >
                  <span className="font-mono text-sm font-semibold text-ink">
                    {campaign.applicationsCount}
                  </span>
                </Row>
                {campaign.minFollowers > 0 && (
                  <Row
                    label={
                      <span className="flex items-center gap-2">
                        <Star className="h-[15px] w-[15px]" /> Min. followers
                      </span>
                    }
                  >
                    <span className="font-mono text-sm font-semibold text-ink">
                      {formatCompactNumber(campaign.minFollowers)}
                    </span>
                  </Row>
                )}
              </dl>

              <div className="mt-5">
                <ApplyPanel
                  campaignId={campaign._id}
                  campaignTitle={campaign.title}
                  isActive={isActive}
                />
              </div>
            </div>

            {/* More from business */}
            {otherCampaigns.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  More from {business?.businessName}
                </h3>
                <div className="flex flex-col gap-3">
                  {otherCampaigns.map((c) => (
                    <CampaignCard key={c._id} campaign={toCampaignCardData(c)} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </Container>
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}
