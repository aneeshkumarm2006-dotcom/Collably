'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { config } from '@/lib/config';
import { toast } from '@/lib/toast';

/**
 * "Continue with Google" via Google Identity Services. When a web client ID is
 * configured (`NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`), this loads the GIS script and
 * renders Google's official button, which yields an ID token on success — handed
 * to `onCredential` (the page then calls `AuthProvider.loginWithGoogle`). The
 * backend `/auth/google` verifies that ID token against the same audience.
 *
 * Without a client ID (e.g. local/mock dev), it degrades to a styled placeholder
 * that explains Google sign-in isn't configured — so the design stays intact.
 */

// Minimal slice of the GIS global we use.
interface GsiId {
  initialize(opts: {
    client_id: string;
    callback: (res: { credential?: string }) => void;
  }): void;
  renderButton(
    parent: HTMLElement,
    opts: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'small' | 'medium' | 'large';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
      logo_alignment?: 'left' | 'center';
    },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Load the GIS script once, shared across mounts. */
let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      if (window.google?.accounts?.id) resolve();
      else existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

const GoogleGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export interface GoogleButtonProps {
  /** Called with the Google ID token (JWT credential) on successful sign-in. */
  onCredential: (idToken: string) => void | Promise<void>;
  /** Button label variant. */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  /** Disable interaction (e.g. while a submit is in flight). */
  disabled?: boolean;
}

export function GoogleButton({ onCredential, text = 'continue_with', disabled }: GoogleButtonProps) {
  const clientId = config.googleOAuthClientId;
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();
  const [ready, setReady] = useState(false);

  // Keep the latest callback reachable from the GIS closure.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGsi()
      .then(() => {
        const id = window.google?.accounts?.id;
        const parent = containerRef.current;
        if (cancelled || !id || !parent) return;

        id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res.credential) void onCredentialRef.current(res.credential);
          },
        });

        parent.innerHTML = '';
        const width = Math.min(Math.max(parent.clientWidth, 200), 400);
        id.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  // No client ID → styled, disabled placeholder that explains the situation.
  if (!clientId) {
    return (
      <button
        type="button"
        id={fallbackId}
        onClick={() =>
          toast.info('Google sign-in isn’t configured in this environment. Use email instead.')
        }
        className="flex w-full items-center justify-center gap-2.5 rounded-md border border-hair-strong bg-card px-4 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-secondary"
      >
        <GoogleGlyph />
        Continue with Google
      </button>
    );
  }

  return (
    <div className="relative min-h-[44px]">
      {/* GIS renders its own button here once loaded. */}
      <div
        ref={containerRef}
        className={disabled ? 'pointer-events-none opacity-60' : undefined}
        // Center the GIS iframe button within the full-width container.
        style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}
      />
      {/* Placeholder overlay until GIS paints its button (avoids layout shift). */}
      {!ready && (
        <div className="absolute inset-0 flex w-full items-center justify-center gap-2.5 rounded-md border border-hair-strong bg-card px-4 py-3 text-[15px] font-semibold text-faint">
          <GoogleGlyph />
          Continue with Google
        </div>
      )}
    </div>
  );
}
