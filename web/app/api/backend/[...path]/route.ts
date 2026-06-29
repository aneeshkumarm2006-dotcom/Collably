/**
 * Same-origin backend proxy. The browser data client (`lib/api/client.ts`) calls
 * `/api/backend/<path>`; this handler forwards the request to the real backend
 * with the httpOnly access cookie promoted to an `Authorization: Bearer` header,
 * so the JWT never reaches client JS. Query string, method, and JSON body are
 * passed through; the backend's status + body are returned verbatim.
 *
 * Single-flight refresh-on-401 (mirrors the mobile client): when the backend
 * returns 401 and a refresh cookie is present, mint a fresh pair via
 * `/auth/refresh`, rewrite both cookies on the response, and retry the original
 * request once. If the refresh fails the cookies are cleared and the 401 is
 * forwarded so the client can route back to login.
 *
 * In mock mode the outgoing `fetch` is intercepted by the MSW node server started
 * in `instrumentation.ts`, so no real backend is contacted.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config, ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/config';
import { refreshSession } from '@/lib/auth/backend';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';

// Always run on the Node runtime (cookies + global fetch interception) and never
// cache — every proxied call is per-request.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Forward one request to the backend with the given access token (if any). */
function forward(
  req: NextRequest,
  target: string,
  body: string | undefined,
  accessToken: string | undefined,
): Promise<Response> {
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  return fetch(target, {
    method: req.method,
    headers,
    body: body || undefined,
    cache: 'no-store',
  });
}

/** Build a NextResponse mirroring the backend's status + body. */
async function passthrough(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

function unreachable(): NextResponse {
  return NextResponse.json(
    { message: 'Unable to reach the server. Please try again.' },
    { status: 502 },
  );
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const target = `${config.backendInternalUrl}/${path.join('/')}${search}`;

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  // Read the body once so it can be replayed on the post-refresh retry.
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  let upstream: Response;
  try {
    upstream = await forward(req, target, body, accessToken);
  } catch {
    return unreachable();
  }

  // Refresh-on-401: only worth attempting when we hold a refresh token.
  if (upstream.status === 401 && refreshToken) {
    const refreshed = await refreshSession(refreshToken);
    if (refreshed) {
      let retry: Response;
      try {
        retry = await forward(req, target, body, refreshed.accessToken);
      } catch {
        return unreachable();
      }
      const res = await passthrough(retry);
      setAuthCookies(res, refreshed);
      return res;
    }
    // Refresh rejected — the session is unrecoverable. Clear it and forward 401.
    const res = await passthrough(upstream);
    clearAuthCookies(res);
    return res;
  }

  return passthrough(upstream);
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
