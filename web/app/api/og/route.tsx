/**
 * Dynamic Open Graph image generator (1200×630). Used as the default social
 * preview for every public page; `lib/seo.ts` builds the URL with `?title=`,
 * `?subtitle=`, and `?eyebrow=` so each page previews with its own copy.
 *
 * Edge runtime — pure rendering, no backend access.
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BRAND = '#1877F2';
const INK_BG = '#18191A';
const PANEL = '#1f2123';

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') ?? 'Collably').slice(0, 120);
  const subtitle = (searchParams.get('subtitle') ?? '').slice(0, 180);
  const eyebrow = (searchParams.get('eyebrow') ?? 'The local collab marketplace').slice(0, 60);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: INK_BG,
          backgroundImage:
            'linear-gradient(135deg, rgba(24,119,242,0.34) 0%, rgba(24,119,242,0) 48%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              backgroundColor: BRAND,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em' }}>Collably</div>
        </div>

        {/* Headline block */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: '#8aa9ff',
              marginBottom: '24px',
              display: 'flex',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: title.length > 48 ? '64px' : '78px',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              display: 'flex',
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: '30px',
                color: 'rgba(255,255,255,0.72)',
                marginTop: '28px',
                lineHeight: 1.4,
                display: 'flex',
                maxWidth: '960px',
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Footer chips */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['No follower minimums', 'Real rewards', 'Verified end-to-end'].map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                backgroundColor: PANEL,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '999px',
                padding: '12px 22px',
                fontSize: '22px',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
