import type { BusinessRow } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ApproveControl } from './ApproveControl';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Only allow http(s) links through to the DOM; block javascript:/data: etc. */
function safeHref(url?: string): string | null {
  if (!url) return null;
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(candidate);
    return u.protocol === 'http:' || u.protocol === 'https:' ? candidate : null;
  } catch {
    return null;
  }
}

type Status = 'review' | 'verified' | 'suspended';

const STRIPE: Record<Status, string> = {
  review: 'bg-warn',
  verified: 'bg-good',
  suspended: 'bg-danger',
};

const AVATAR: Record<Status, string> = {
  review: 'bg-[linear-gradient(150deg,#F0B65A,#C77A16)]',
  verified: 'bg-[linear-gradient(150deg,#2D88FF,#1877F2)]',
  suspended: 'bg-[linear-gradient(150deg,#F07A7A,#D23636)]',
};

export function BusinessCard({ business }: { business: BusinessRow }) {
  const name = business.businessName?.trim() || 'Unnamed business';
  const initial = name.charAt(0).toUpperCase() || '?';
  const ownerName = business.user?.name ?? '—';
  const email = business.user?.email ?? '—';
  const location = [business.location?.city, business.location?.state, business.location?.country]
    .filter(Boolean)
    .join(', ');

  const status: Status = business.isSuspended
    ? 'suspended'
    : business.isVerified
      ? 'verified'
      : 'review';

  const websiteHref = safeHref(business.website);
  const metaParts = [
    business.category,
    location,
    business.createdAt ? `joined ${formatDate(business.createdAt)}` : '',
  ].filter(Boolean);

  const socials: [string, string][] = (
    [
      ['Instagram', business.socialLinks?.instagram],
      ['TikTok', business.socialLinks?.tiktok],
      ['YouTube', business.socialLinks?.youtube],
    ] as [string, string | undefined][]
  )
    .map(([label, value]) => [label, safeHref(value)] as [string, string | null])
    .filter((entry): entry is [string, string] => Boolean(entry[1]));

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
                <StatusBadge verified={business.isVerified} suspended={business.isSuspended} />
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
          <div className="shrink-0">
            <ApproveControl kind="businesses" id={business._id} isVerified={business.isVerified} />
          </div>
        </header>

        <dl className="mt-4 grid gap-2 border-t border-hair2 pt-3.5 text-[13px]">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-bold text-ink">Owner</dt>
            <dd className="min-w-0 truncate text-muted">
              {ownerName} <span className="text-faint">·</span> {email}
            </dd>
          </div>
          {websiteHref && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-bold text-ink">Website</dt>
              <dd className="min-w-0">
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 break-all font-semibold text-brand hover:underline"
                >
                  {business.website}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </dd>
            </div>
          )}
          {socials.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-bold text-ink">Socials</dt>
              <dd className="flex flex-wrap gap-x-4 gap-y-1">
                {socials.map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    {label} ↗
                  </a>
                ))}
              </dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-bold text-ink">Activity</dt>
            <dd className="text-muted">
              {business.totalCampaigns} campaign{business.totalCampaigns === 1 ? '' : 's'}{' '}
              <span className="text-faint">·</span> {business.totalCollabsCompleted} collab
              {business.totalCollabsCompleted === 1 ? '' : 's'} completed
            </dd>
          </div>
        </dl>

        {business.description && (
          <p className="mt-3 line-clamp-3 border-t border-hair2 pt-3 text-[13px] text-muted">
            {business.description}
          </p>
        )}
      </div>
    </article>
  );
}
