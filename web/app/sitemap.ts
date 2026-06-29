/**
 * XML sitemap. Always includes the static marketing routes + blog posts; tries
 * to enrich with live campaigns and their businesses (degrades gracefully if the
 * backend is unavailable so a build/SSG never fails on it).
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { getAllPostsMeta } from '@/lib/blog';
import { serverApi } from '@/lib/api/server';

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/explore', priority: 0.9, changeFrequency: 'hourly' },
  { path: '/for-creators', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/for-businesses', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/blog', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = getAllPostsMeta().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await serverApi.campaigns.list({ status: 'Active', sort: 'newest', limit: 50 });
    const businessIds = new Set<string>();
    for (const c of res.data) {
      dynamicEntries.push({
        url: `${SITE_URL}/campaign/${c._id}`,
        lastModified: new Date(c.updatedAt ?? c.createdAt),
        changeFrequency: 'daily',
        priority: 0.7,
      });
      if (c.business?._id) businessIds.add(c.business._id);
    }
    for (const id of businessIds) {
      dynamicEntries.push({
        url: `${SITE_URL}/business/${id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  } catch {
    // Backend unavailable: ship the static + blog sitemap.
  }

  return [...staticEntries, ...blogEntries, ...dynamicEntries];
}
