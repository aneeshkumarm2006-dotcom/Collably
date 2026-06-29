import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BadgeCheck, Globe, Instagram, MapPin, Megaphone } from 'lucide-react';

import { publicApi } from '@/lib/api/public';
import { isApiError } from '@/lib/api/errors';
import type { PublicBusinessProfileResponse, PublicCampaign } from '@/lib/api/types';
import { toCampaignCardData } from '@/lib/campaign-card';
import { categoryEmoji } from '@/lib/domain-meta';
import { buildMetadata, businessJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { Container } from '@/components/marketing/section';
import { Avatar } from '@/components/shared/avatar';
import { CampaignCard } from '@/components/shared/campaign-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/shared/json-ld';

// Public profile — on-demand ISR (no per-user variance); cached for `revalidate`.
export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const getBusiness = cache(async (id: string): Promise<PublicBusinessProfileResponse | null> => {
  try {
    return await publicApi.profiles.getPublicBusiness(id);
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await getBusiness(id);
  if (!res) {
    return buildMetadata({ title: 'Business not found', description: '', path: `/business/${id}`, noIndex: true });
  }
  const { profile } = res;
  return buildMetadata({
    title: profile.businessName,
    description:
      profile.description?.slice(0, 180) ??
      `${profile.businessName} runs creator collabs on Collably.`,
    path: `/business/${id}`,
    image: profile.logo ?? undefined,
    ogEyebrow: `${profile.category} · Business`,
  });
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getBusiness(id);
  if (!res) notFound();

  const { profile } = res;
  const loc = [profile.location?.city, profile.location?.state].filter(Boolean).join(', ');
  const igHandle = profile.socialLinks?.instagram;

  let active: PublicCampaign[] = [];
  try {
    const list = await publicApi.campaigns.list({ businessId: id, status: 'Active', limit: 12 });
    active = list.data;
  } catch {
    active = [];
  }

  return (
    <div className="bg-page pb-16">
      <JsonLd
        data={[
          businessJsonLd({
            id,
            name: profile.businessName,
            description: profile.description,
            logo: profile.logo,
            website: profile.website,
            city: profile.location?.city,
            country: profile.location?.country,
          }),
          breadcrumbJsonLd([
            { name: 'Explore', path: '/explore' },
            { name: profile.businessName, path: `/business/${id}` },
          ]),
        ]}
      />

      {/* Header band */}
      <header className="relative overflow-hidden bg-dark-sidebar text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(700px 360px at 82% 10%, rgba(24,119,242,0.30), transparent 60%)',
          }}
        />
        <Container className="relative py-10">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={profile.businessName} src={profile.logo} size={76} shape="square" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.businessName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
                <span>
                  {categoryEmoji(profile.category)} {profile.category}
                </span>
                {loc && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {loc}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              {profile.website && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                </Button>
              )}
              {igHandle && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <a
                    href={`https://instagram.com/${igHandle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Stat pills */}
          <div className="mt-7 flex flex-wrap gap-2.5">
            <StatPill label="Campaigns" value={profile.totalCampaigns} icon={<Megaphone className="h-4 w-4" />} />
            <StatPill label="Collabs completed" value={profile.totalCollabsCompleted} icon={<BadgeCheck className="h-4 w-4" />} />
            <StatPill label="Active now" value={active.length} dot />
          </div>
        </Container>
      </header>

      {/* Body */}
      <Container className="py-10">
        <div className="grid gap-9 lg:grid-cols-[340px_1fr] lg:items-start">
          {/* About */}
          <aside className="rounded-xl border border-hair bg-card p-6">
            <h2 className="text-lg font-bold text-ink">About</h2>
            {profile.description ? (
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{profile.description}</p>
            ) : (
              <p className="mt-3 text-sm text-faint">No description yet.</p>
            )}
            <dl className="mt-5 flex flex-col gap-3 border-t border-hair pt-5 text-sm">
              {loc && (
                <div className="flex items-center gap-2.5 text-muted">
                  <MapPin className="h-4 w-4 text-faint" /> {loc}
                </div>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2.5 text-brand hover:underline"
                >
                  <Globe className="h-4 w-4 text-faint" />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {igHandle && (
                <a
                  href={`https://instagram.com/${igHandle.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-2.5 text-brand hover:underline"
                >
                  <Instagram className="h-4 w-4 text-faint" />@{igHandle.replace(/^@/, '')}
                </a>
              )}
            </dl>
          </aside>

          {/* Active campaigns */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink">Active campaigns</h2>
              {active.length > 0 && (
                <Link
                  href={`/explore?location=${encodeURIComponent(profile.location?.city ?? '')}`}
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Explore more →
                </Link>
              )}
            </div>
            {active.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {active.map((c) => (
                  <CampaignCard key={c._id} campaign={toCampaignCardData(c)} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Megaphone />}
                title="No active campaigns"
                description={`${profile.businessName} doesn’t have any open campaigns right now. Check back soon.`}
              />
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}

function StatPill({
  label,
  value,
  icon,
  dot,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-1.5 text-sm text-white/80">
      {dot ? <span className="h-2 w-2 rounded-full bg-money" /> : icon}
      <b className="font-mono font-semibold text-white">{value}</b> {label}
    </span>
  );
}
