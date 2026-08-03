import type { CreatorRow, SocialHandle } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ApproveControl } from './ApproveControl';
import { PlatformVerifyControl } from './PlatformVerifyControl';
import { PlatformIcon } from './PlatformIcon';
import { MessageThread } from './MessageThread';

const PLATFORMS: { key: 'instagram' | 'tiktok' | 'youtube'; label: string }[] = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Only allow http(s) links through to the DOM; block javascript:/data: etc. */
function safeHref(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

type Status = 'review' | 'verified' | 'rejected';

const STRIPE: Record<Status, string> = {
  review: 'bg-warn',
  verified: 'bg-good',
  rejected: 'bg-danger',
};

const AVATAR: Record<Status, string> = {
  review: 'bg-[linear-gradient(150deg,#F0B65A,#C77A16)]',
  verified: 'bg-[linear-gradient(150deg,#2D88FF,#1877F2)]',
  rejected: 'bg-[linear-gradient(150deg,#F07A7A,#D23636)]',
};

export function CreatorCard({ creator }: { creator: CreatorRow }) {
  const name = creator.user?.name ?? 'Unknown creator';
  const email = creator.user?.email ?? '—';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const location = [creator.location?.city, creator.location?.state, creator.location?.country]
    .filter(Boolean)
    .join(', ');
  const isRejected = Boolean(creator.rejectionReason) && !creator.isVerified;
  const status: Status = creator.isSuspended
    ? 'rejected'
    : creator.isVerified
      ? 'verified'
      : isRejected
        ? 'rejected'
        : 'review';

  const submitted = PLATFORMS.map((p) => ({ ...p, handle: creator.socialHandles?.[p.key] })).filter(
    (x): x is { key: 'instagram' | 'tiktok' | 'youtube'; label: string; handle: SocialHandle } =>
      Boolean(x.handle),
  );

  const metaParts = [email, location, creator.createdAt ? `joined ${formatDate(creator.createdAt)}` : '']
    .filter(Boolean);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-hair bg-card shadow-card">
      <span className={`absolute inset-y-0 left-0 w-1 ${STRIPE[status]}`} aria-hidden="true" />
      <div className="py-5 pl-6 pr-5">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-3.5">
            <span
              className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[13px] text-lg font-extrabold text-white ${AVATAR[status]}`}
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16.5px] font-extrabold tracking-tight text-ink">{name}</h3>
                <StatusBadge
                  verified={creator.isVerified}
                  suspended={creator.isSuspended}
                  rejected={isRejected}
                />
                {creator.isUGCOnly && (
                  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-deep">
                    UGC
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[13px] tabular-nums text-muted">
                {metaParts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1.5 text-faint">·</span>}
                    {part}
                  </span>
                ))}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ApproveControl kind="creators" id={creator._id} isVerified={creator.isVerified} />
            <MessageThread creatorId={creator._id} creatorName={name} />
          </div>
        </header>

        {/* Outstanding rejection note (what the creator was told to fix). */}
        {creator.rejectionReason && (
          <div className="mt-3.5 flex gap-2.5 rounded-[10px] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-ink">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 h-4 w-4 shrink-0 text-danger"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            <p>
              <span className="font-bold text-danger">Rejected:</span> {creator.rejectionReason}
            </p>
          </div>
        )}

        {/* Submitted social handles — the focus of creator verification. */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">
            Submitted social handles
          </p>
          {submitted.length === 0 ? (
            <p className="text-sm font-semibold text-danger">No social handle submitted.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {submitted.map((s) => {
                const href = safeHref(s.handle.link);
                const count =
                  typeof s.handle.followerCount === 'number'
                    ? `${s.handle.followerCount.toLocaleString()} followers`
                    : typeof s.handle.subscriberCount === 'number'
                      ? `${s.handle.subscriberCount.toLocaleString()} subscribers`
                      : null;
                return (
                  <li
                    key={s.key}
                    className="flex items-center gap-3 rounded-xl border border-hair2 bg-elev px-3 py-2.5"
                  >
                    <PlatformIcon platform={s.key} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[13.5px] font-bold text-ink">{s.label}</span>{' '}
                      <span className="text-[13px] text-muted">{s.handle.handle}</span>
                      {count && <span className="text-xs text-faint"> · {count}</span>}
                    </div>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold text-brand hover:underline"
                      >
                        Open
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                          aria-hidden="true"
                        >
                          <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </a>
                    )}
                    <PlatformVerifyControl
                      id={creator._id}
                      platform={s.key}
                      verified={Boolean(s.handle.verified)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(creator.niche.length > 0 || creator.bio) && (
          <div className="mt-4 border-t border-hair2 pt-3.5 text-[13px] text-muted">
            {creator.niche.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">Niches:</span>
                {creator.niche.map((n) => (
                  <span
                    key={n}
                    className="rounded-md border border-hair2 bg-elev px-2 py-0.5 text-xs font-semibold text-muted"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
            {creator.bio && <p className="mt-2 line-clamp-3">{creator.bio}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
