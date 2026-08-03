/**
 * Brand tile + inline SVG for a submitted social platform. Icons are copied
 * from the approved design mockup (Instagram gradient, TikTok black, YouTube
 * red) so no third-party icon dependency is added.
 */
type Platform = 'instagram' | 'tiktok' | 'youtube';

const TILE: Record<Platform, string> = {
  instagram: 'bg-[linear-gradient(135deg,#F58529,#DD2A7B_55%,#8134AF)]',
  tiktok: 'bg-[#111]',
  youtube: 'bg-[#FF0000]',
};

function Glyph({ platform }: { platform: Platform }) {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M16 3c.3 2 1.6 3.7 3.5 4.1v2.6c-1.3 0-2.5-.4-3.5-1v6.1c0 3-2.2 5.2-5.1 5.2S6 17.8 6 15s2.4-5 5.3-4.8v2.7c-1.4-.3-2.7.7-2.7 2.1 0 1.3 1 2.3 2.3 2.3s2.4-1 2.4-2.6V3Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M22 12s0-3.4-.4-5c-.2-.9-1-1.6-1.9-1.8C18 5 12 5 12 5s-6 0-7.7.2c-.9.2-1.7.9-1.9 1.8C2 8.6 2 12 2 12s0 3.4.4 5c.2.9 1 1.6 1.9 1.8C6 19 12 19 12 19s6 0 7.7-.2c.9-.2 1.7-.9 1.9-1.8.4-1.6.4-5 .4-5Zm-12 3V9l5 3-5 3Z" />
    </svg>
  );
}

export function PlatformIcon({ platform }: { platform: Platform }) {
  return (
    <span
      className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg text-white ${TILE[platform]}`}
    >
      <Glyph platform={platform} />
    </span>
  );
}
