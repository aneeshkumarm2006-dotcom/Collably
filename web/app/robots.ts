/**
 * robots.txt: allow crawling of the public site; keep authed/app-internal
 * areas out of the index. Points crawlers at the sitemap.
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard/',
        '/onboarding/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password/',
        '/styleguide',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
