'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

import type { PublicCampaign } from '@/lib/api/types';
import { useGoogleMaps } from '@/lib/maps/use-google-maps';
import { clusterPoints } from '@/lib/maps/cluster';
import { campaignMapPoints } from '@/lib/maps/campaign-points';
import { clusterIcon, valuePinIcon, type MarkerIcon } from '@/lib/maps/markers';
import { cn } from '@/lib/utils';
import { MapStatePanel } from './map-frame';

/** Canada-centric default view used until the points are fitted. */
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 56.13, lng: -106.35 };
const DEFAULT_ZOOM = 4;

/**
 * Explore map (Phase 11). Plots campaign pins with green value bubbles, collapses
 * overlapping ones into brand-blue clusters (split apart on zoom-in), routes a
 * pin click to its campaign, and zooms into a cluster click. Degrades to an
 * informative panel when Maps JS is unconfigured / fails. The list view is the
 * always-available fallback.
 */
export function CampaignMap({
  campaigns,
  className,
}: {
  campaigns: PublicCampaign[];
  className?: string;
}) {
  const { status, maps } = useGoogleMaps();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const points = useMemo(() => campaignMapPoints(campaigns), [campaigns]);

  // Keep the latest render closure reachable from the (stable) idle listener.
  const renderRef = useRef<() => void>(() => {});

  // A stable key for the current point set → refit bounds only when it changes.
  const pointsKey = useMemo(() => points.map((p) => p.id).sort().join(','), [points]);
  const fittedKeyRef = useRef<string | null>(null);

  renderRef.current = () => {
    const map = mapRef.current;
    if (!map || !maps) return;

    // Clear previous markers.
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    const zoom = map.getZoom() ?? DEFAULT_ZOOM;
    const clusters = clusterPoints(points, zoom);

    for (const cluster of clusters) {
      const isCluster = cluster.points.length > 1;
      const descriptor: MarkerIcon = isCluster
        ? clusterIcon(cluster.points.length)
        : valuePinIcon(cluster.points[0].item.rewardLabel);

      const icon: google.maps.Icon = {
        url: descriptor.url,
        scaledSize: new maps.Size(descriptor.width, descriptor.height),
        anchor: new maps.Point(
          descriptor.width / 2,
          isCluster ? descriptor.height / 2 : descriptor.height,
        ),
      };

      const marker = new maps.Marker({
        position: { lat: cluster.lat, lng: cluster.lng },
        map,
        icon,
        title: isCluster
          ? `${cluster.points.length} campaigns here`
          : cluster.points[0].item.title,
        zIndex: isCluster ? 10 : 20,
      });

      marker.addListener('click', () => {
        if (isCluster) {
          map.panTo({ lat: cluster.lat, lng: cluster.lng });
          map.setZoom(Math.min(16, (map.getZoom() ?? DEFAULT_ZOOM) + 2));
        } else {
          router.push(`/campaign/${cluster.points[0].item.id}`);
        }
      });

      markersRef.current.push(marker);
    }
  };

  // Initialize the map once Maps JS is ready and the container is mounted.
  useEffect(() => {
    if (status !== 'ready' || !maps || !containerRef.current || mapRef.current) return;
    const map = new maps.Map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
      backgroundColor: '#e9eef5',
    });
    mapRef.current = map;
    map.addListener('idle', () => renderRef.current());
    renderRef.current();
  }, [status, maps]);

  // Fit to the point set whenever it changes (after the map exists).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maps) return;
    renderRef.current();
    if (fittedKeyRef.current === pointsKey) return;
    fittedKeyRef.current = pointsKey;
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(12);
      return;
    }
    const bounds = new maps.LatLngBounds();
    for (const p of points) bounds.extend({ lat: p.lat, lng: p.lng });
    map.fitBounds(bounds, 64);
  }, [pointsKey, points, maps]);

  // Tear down markers + listeners on unmount.
  useEffect(() => {
    return () => {
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
      if (mapRef.current && maps) maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, [maps]);

  if (status !== 'ready') {
    return <MapStatePanel status={status} className={cn('min-h-[420px]', className)} />;
  }
  if (points.length === 0) {
    return (
      <MapStatePanel
        status="ready"
        empty
        title="No on-site campaigns to map"
        description="These results are remote, or don’t have a pinned location. Switch to the list to see them all."
        className={cn('min-h-[420px]', className)}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('min-h-[420px] w-full overflow-hidden rounded-xl border border-hair', className)}
      role="application"
      aria-label="Map of campaign locations"
    />
  );
}
