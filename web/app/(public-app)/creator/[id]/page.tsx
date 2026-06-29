import { cache } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ExternalLink, Image as ImageIcon, Instagram, MapPin, Music2, Youtube } from 'lucide-react';

import { publicApi } from '@/lib/api/public';
import { isApiError } from '@/lib/api/errors';
import type { PublicCreatorProfileResponse } from '@/lib/api/types';
import { formatCompactNumber, formatCurrency } from '@/lib/format';
import { nicheIcon } from '@/lib/domain-meta';
import { buildMetadata, creatorJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { Container } from '@/components/marketing/section';
import { Avatar } from '@/components/shared/avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { JsonLd } from '@/components/shared/json-ld';

// Public profile: on-demand ISR (no per-user variance); cached for `revalidate`.
export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

const getCreator = cache(async (id: string): Promise<PublicCreatorProfileResponse | null> => {
  try {
    return await publicApi.profiles.getPublicCreator(id);
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
  const res = await getCreator(id);
  if (!res) {
    return buildMetadata({ title: 'Creator not found', description: '', path: `/creator/${id}`, noIndex: true });
  }
  const name = res.user?.name ?? 'Creator';
  return buildMetadata({
    title: name,
    description:
      res.profile.bio?.slice(0, 180) ??
      `${name} is a creator on Collably${res.profile.niche.length ? `: ${res.profile.niche.join(', ')}.` : '.'}`,
    path: `/creator/${id}`,
    image: res.user?.avatar ?? undefined,
    ogEyebrow: 'Creator',
  });
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getCreator(id);
  if (!res) notFound();

  const { profile, user } = res;
  const name = user?.name ?? 'Creator';
  const loc = [profile.location?.city, profile.location?.state].filter(Boolean).join(', ');
  const handles = profile.socialHandles ?? {};
  const platformCount = [handles.instagram, handles.youtube, handles.tiktok].filter(Boolean).length;

  const socialRows = [
    handles.instagram && {
      icon: Instagram,
      handle: handles.instagram.handle,
      link: handles.instagram.link,
      count: handles.instagram.followerCount,
      unit: 'followers',
    },
    handles.youtube && {
      icon: Youtube,
      handle: handles.youtube.handle,
      link: handles.youtube.link,
      count: handles.youtube.subscriberCount,
      unit: 'subscribers',
    },
    handles.tiktok && {
      icon: Music2,
      handle: handles.tiktok.handle,
      link: handles.tiktok.link,
      count: handles.tiktok.followerCount,
      unit: 'followers',
    },
  ].filter(Boolean) as {
    icon: typeof Instagram;
    handle: string;
    link: string;
    count?: number;
    unit: string;
  }[];

  return (
    <div className="bg-page pb-16">
      <JsonLd
        data={[
          creatorJsonLd({ id, name, bio: profile.bio, avatar: user?.avatar, niche: profile.niche }),
          breadcrumbJsonLd([
            { name: 'Explore', path: '/explore' },
            { name, path: `/creator/${id}` },
          ]),
        ]}
      />

      <Container className="py-10">
        <div className="grid gap-10 lg:grid-cols-[300px_1fr] lg:items-start">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-[84px]">
            <Avatar name={name} src={user?.avatar} size={96} />
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">{name}</h1>

            {profile.niche.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.niche.map((n) => {
                  const NicheIcon = nicheIcon(n);
                  return (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 rounded-full border border-hair bg-card px-2.5 py-1 text-[13px] text-ink"
                    >
                      <NicheIcon aria-hidden className="h-3.5 w-3.5" /> {n}
                    </span>
                  );
                })}
              </div>
            )}

            {loc && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="h-4 w-4" /> {loc}
              </div>
            )}

            {profile.isUGCOnly && (
              <span className="mt-3 inline-flex rounded-full bg-brand-soft px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide text-brand">
                UGC creator
              </span>
            )}

            {profile.bio && (
              <p className="mt-4 text-sm leading-relaxed text-muted">{profile.bio}</p>
            )}

            {/* Socials */}
            {socialRows.length > 0 && (
              <div className="mt-5 flex flex-col">
                {socialRows.map((s) => (
                  <a
                    key={s.handle}
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-3 border-b border-hair py-3 last:border-0 transition-colors hover:text-brand"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted">
                      <s.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-ink">@{s.handle.replace(/^@/, '')}</div>
                      {typeof s.count === 'number' && (
                        <div className="text-xs text-muted">
                          <span className="font-mono text-ink">{formatCompactNumber(s.count)}</span>{' '}
                          {s.unit}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Content types */}
            {profile.contentTypes.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {profile.contentTypes.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-hair bg-card px-2.5 py-1 text-[13px] text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <StatTile value={String(profile.totalCollabsCompleted)} label="Collabs" />
              <StatTile value={String(platformCount)} label="Platforms" />
              <StatTile
                value={
                  profile.totalRewardsEarned > 0
                    ? formatCurrency(profile.totalRewardsEarned)
                    : '—'
                }
                label="Earned"
              />
            </div>
          </aside>

          {/* Portfolio */}
          <div>
            <h2 className="mb-5 text-xl font-bold text-ink">Portfolio</h2>
            {profile.portfolio.length > 0 ? (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {profile.portfolio.map((item, i) => (
                  <a
                    key={i}
                    href={item.link || item.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-secondary"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.caption ?? ''}
                      fill
                      sizes="(max-width: 640px) 50vw, 240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 transition-opacity group-hover:opacity-100">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                    {item.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="text-[13px] font-medium text-white">{item.caption}</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ImageIcon />}
                title="No portfolio yet"
                description={`${name} hasn’t added portfolio work yet.`}
              />
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-secondary p-3 text-center">
      <div className="font-mono text-lg font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}
