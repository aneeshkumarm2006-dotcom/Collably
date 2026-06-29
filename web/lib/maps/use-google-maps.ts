'use client';

import { useEffect, useState } from 'react';

import { isMapsConfigured, loadGoogleMaps, MapsUnconfiguredError } from './loader';

export type MapsStatus = 'unconfigured' | 'loading' | 'ready' | 'error';

/**
 * React hook that loads Maps JS on mount and reports its lifecycle. `status`
 * starts at `unconfigured` (no key → never loads) or `loading`, settling to
 * `ready` / `error`. Map components branch on this to show a graceful placeholder
 * when maps aren't available in this environment.
 */
export function useGoogleMaps(): { status: MapsStatus; maps: typeof google.maps | null } {
  const [status, setStatus] = useState<MapsStatus>(() =>
    isMapsConfigured() ? 'loading' : 'unconfigured',
  );
  const [maps, setMaps] = useState<typeof google.maps | null>(null);

  useEffect(() => {
    if (!isMapsConfigured()) {
      setStatus('unconfigured');
      return;
    }
    let alive = true;
    setStatus('loading');
    loadGoogleMaps()
      .then((ns) => {
        if (!alive) return;
        setMaps(ns);
        setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        setStatus(err instanceof MapsUnconfiguredError ? 'unconfigured' : 'error');
      });
    return () => {
      alive = false;
    };
  }, []);

  return { status, maps };
}
