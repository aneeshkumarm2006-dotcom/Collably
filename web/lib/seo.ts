/**
 * SEO helpers: one place to build per-page `Metadata` (canonical URL,
 * Open Graph + Twitter cards) and the JSON-LD structured-data objects we embed
 * (Organization, WebSite, BreadcrumbList, Offer for campaigns, Person/Organization
 * for profiles, BlogPosting). Keeps every public route consistent and DRY.
 *
 * Default social images are produced by the dynamic generator at `/api/og`
 * (`app/api/og/route.tsx`); per-page metadata can override `image` with a real
 * cover (blog posts, campaigns) so shared links preview the actual content.
 */
import type { Metadata } from 'next';
import { config } from '@/lib/config';

export const SITE_NAME = 'Collably';
export const SITE_URL = config.siteUrl;
export const SITE_TAGLINE = 'The local collab marketplace';
export const SITE_DESCRIPTION =
  'Collably is the marketplace where local businesses run gifting campaigns and creators earn real rewards. No agencies, no follower gatekeeping.';

/** Public social handles (used in footer + Organization `sameAs`). */
export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/collably',
  twitter: 'https://twitter.com/collably',
  linkedin: 'https://linkedin.com/company/collably',
} as const;

/** Resolve a path (or pass through an absolute URL) to a fully-qualified URL. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** URL for our dynamic OG image generator, customized per page. */
export function ogImageUrl(opts?: { title?: string; subtitle?: string; eyebrow?: string }): string {
  const params = new URLSearchParams();
  if (opts?.title) params.set('title', opts.title);
  if (opts?.subtitle) params.set('subtitle', opts.subtitle);
  if (opts?.eyebrow) params.set('eyebrow', opts.eyebrow);
  const qs = params.toString();
  return absoluteUrl(`/api/og${qs ? `?${qs}` : ''}`);
}

export interface PageMetaInput {
  /** Page title: the root template appends "· Collably". Omit on the homepage. */
  title?: string;
  description: string;
  /** Canonical path, e.g. "/pricing". */
  path: string;
  /** Explicit social image (absolute or app-relative). Defaults to the OG generator. */
  image?: string;
  /** Eyebrow line shown on the generated OG image (e.g. "Blog · Guides"). */
  ogEyebrow?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  keywords?: string[];
}

/**
 * Build a page's `Metadata`: canonical URL + Open Graph + Twitter card. `title`
 * and `description` flow into all three; OG/Twitter titles are left unset so they
 * inherit the resolved (templated) page title.
 */
export function buildMetadata(input: PageMetaInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const image = input.image
    ? absoluteUrl(input.image)
    : ogImageUrl({ title: input.title ?? SITE_NAME, subtitle: input.description, eyebrow: input.ogEyebrow });

  return {
    // Omit the key entirely when no title is given (the homepage) so Next inherits
    // the root layout's `title.default` instead of resolving to an empty <title>.
    ...(input.title !== undefined ? { title: input.title } : {}),
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      type: input.type ?? 'website',
      images: [{ url: image, width: 1200, height: 630, alt: input.title ?? SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      description: input.description,
      images: [image],
    },
  };
}

// --- JSON-LD builders ---------------------------------------------------------

/** Site-wide Organization node (logo, socials): embedded once on the homepage. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon.svg'),
    description: SITE_DESCRIPTION,
    sameAs: Object.values(SOCIAL_LINKS),
  };
}

/** WebSite node with a search action pointing at Explore. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/explore?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A campaign modelled as a schema.org Offer (reward = the offered value). */
export function campaignJsonLd(input: {
  id: string;
  title: string;
  description: string;
  category: string;
  rewardValue?: number;
  deadline?: string;
  active: boolean;
  businessName?: string;
  businessId?: string;
  image?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: input.title,
    description: input.description,
    url: absoluteUrl(`/campaign/${input.id}`),
    category: input.category,
    availability: input.active ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    ...(typeof input.rewardValue === 'number' && input.rewardValue > 0
      ? { priceCurrency: 'CAD', price: input.rewardValue }
      : {}),
    ...(input.deadline ? { availabilityEnds: input.deadline } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.businessName
      ? {
          offeredBy: {
            '@type': 'Organization',
            name: input.businessName,
            ...(input.businessId ? { url: absoluteUrl(`/business/${input.businessId}`) } : {}),
          },
        }
      : {}),
  };
}

/** A business profile as an Organization node. */
export function businessJsonLd(input: {
  id: string;
  name: string;
  description?: string;
  logo?: string | null;
  website?: string;
  city?: string;
  country?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: absoluteUrl(`/business/${input.id}`),
    ...(input.description ? { description: input.description } : {}),
    ...(input.logo ? { logo: input.logo } : {}),
    ...(input.website ? { sameAs: [input.website] } : {}),
    ...(input.city
      ? { address: { '@type': 'PostalAddress', addressLocality: input.city, addressCountry: input.country ?? 'CA' } }
      : {}),
  };
}

/** A creator profile as a Person node inside a ProfilePage. */
export function creatorJsonLd(input: {
  id: string;
  name: string;
  bio?: string;
  avatar?: string | null;
  niche?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: input.name,
      url: absoluteUrl(`/creator/${input.id}`),
      ...(input.bio ? { description: input.bio } : {}),
      ...(input.avatar ? { image: input.avatar } : {}),
      ...(input.niche?.length ? { knowsAbout: input.niche } : {}),
    },
  };
}

export function blogPostingJsonLd(input: {
  slug: string;
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    image: input.image ? absoluteUrl(input.image) : ogImageUrl({ title: input.title }),
    url: absoluteUrl(`/blog/${input.slug}`),
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { '@type': 'Person', name: input.authorName },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icon.svg') },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${input.slug}`) },
  };
}
