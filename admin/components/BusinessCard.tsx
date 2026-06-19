import type { BusinessRow } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ApproveControl } from './ApproveControl';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function BusinessCard({ business }: { business: BusinessRow }) {
  const ownerName = business.user?.name ?? '—';
  const email = business.user?.email ?? '—';
  const location = [business.location?.city, business.location?.state, business.location?.country]
    .filter(Boolean)
    .join(', ');
  const socials: [string, string][] = (
    [
      ['Instagram', business.socialLinks?.instagram],
      ['TikTok', business.socialLinks?.tiktok],
      ['YouTube', business.socialLinks?.youtube],
    ] as [string, string | undefined][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <article className="rounded-lg border border-hair bg-card p-5 shadow-card">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">{business.businessName}</h3>
            <StatusBadge verified={business.isVerified} suspended={business.isSuspended} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">
            {business.category}
            {location ? ` · ${location}` : ''}
            {business.createdAt ? ` · joined ${formatDate(business.createdAt)}` : ''}
          </p>
        </div>
        <ApproveControl kind="businesses" id={business._id} isVerified={business.isVerified} />
      </header>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-ink">Owner</dt>
          <dd className="text-muted">
            {ownerName} · {email}
          </dd>
        </div>
        {business.website && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 font-semibold text-ink">Website</dt>
            <dd className="min-w-0">
              <a
                href={normalizeUrl(business.website)}
                target="_blank"
                rel="noreferrer"
                className="break-all text-brand underline underline-offset-2"
              >
                {business.website}
              </a>
            </dd>
          </div>
        )}
        {socials.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 font-semibold text-ink">Socials</dt>
            <dd className="flex flex-wrap gap-x-4 gap-y-1">
              {socials.map(([label, value]) => (
                <a
                  key={label}
                  href={normalizeUrl(value)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline underline-offset-2"
                >
                  {label} ↗
                </a>
              ))}
            </dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-ink">Activity</dt>
          <dd className="text-muted">
            {business.totalCampaigns} campaign{business.totalCampaigns === 1 ? '' : 's'} ·{' '}
            {business.totalCollabsCompleted} collab{business.totalCollabsCompleted === 1 ? '' : 's'}{' '}
            completed
          </dd>
        </div>
      </dl>

      {business.description && (
        <p className="mt-3 line-clamp-3 border-t border-hair pt-3 text-sm text-muted">
          {business.description}
        </p>
      )}
    </article>
  );
}
