import type { CreatorRow, SocialHandle } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ApproveControl } from './ApproveControl';

const PLATFORMS: { key: 'instagram' | 'tiktok' | 'youtube'; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export function CreatorCard({ creator }: { creator: CreatorRow }) {
  const name = creator.user?.name ?? 'Unknown creator';
  const email = creator.user?.email ?? '—';
  const location = [creator.location?.city, creator.location?.state, creator.location?.country]
    .filter(Boolean)
    .join(', ');
  const submitted = PLATFORMS.map((p) => ({ ...p, handle: creator.socialHandles?.[p.key] })).filter(
    (x): x is { key: 'instagram' | 'tiktok' | 'youtube'; label: string; handle: SocialHandle } =>
      Boolean(x.handle),
  );

  return (
    <article className="rounded-lg border border-hair bg-card p-5 shadow-card">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">{name}</h3>
            <StatusBadge verified={creator.isVerified} suspended={creator.isSuspended} />
            {creator.isUGCOnly && (
              <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                UGC
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">
            {email}
            {location ? ` · ${location}` : ''}
            {creator.createdAt ? ` · joined ${formatDate(creator.createdAt)}` : ''}
          </p>
        </div>
        <ApproveControl kind="creators" id={creator._id} isVerified={creator.isVerified} />
      </header>

      {/* Submitted social handles — the focus of creator verification. */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
          Submitted social handles
        </p>
        {submitted.length === 0 ? (
          <p className="text-sm font-medium text-danger">No social handle submitted.</p>
        ) : (
          <ul className="grid gap-2">
            {submitted.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 rounded-md bg-elev px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-ink">{s.label}</span>{' '}
                  <span className="text-sm text-muted">{s.handle.handle}</span>
                  {typeof s.handle.followerCount === 'number' && (
                    <span className="ml-2 text-xs text-faint">
                      {s.handle.followerCount.toLocaleString()} followers
                    </span>
                  )}
                  {typeof s.handle.subscriberCount === 'number' && (
                    <span className="ml-2 text-xs text-faint">
                      {s.handle.subscriberCount.toLocaleString()} subscribers
                    </span>
                  )}
                </div>
                <a
                  href={s.handle.link}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-medium text-brand underline underline-offset-2"
                >
                  Open link ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(creator.niche.length > 0 || creator.bio) && (
        <div className="mt-4 space-y-1 border-t border-hair pt-3 text-sm text-muted">
          {creator.niche.length > 0 && (
            <p>
              <span className="font-semibold text-ink">Niches:</span> {creator.niche.join(', ')}
            </p>
          )}
          {creator.bio && <p className="line-clamp-3">{creator.bio}</p>}
        </div>
      )}
    </article>
  );
}
