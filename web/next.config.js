const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow an isolated build output dir (e.g. CI / a side-by-side prod build that
  // must not clobber a running `next dev`'s `.next`). Defaults to `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // This app lives inside the Collably monorepo (which has sibling lockfiles);
  // pin the file-tracing root to this directory so Next doesn't infer the wrong one.
  // (Mirrors `admin/next.config.js`.)
  outputFileTracingRoot: path.join(__dirname),
  // Allow importing the monorepo `shared/` source (via the `@shared/*` alias),
  // which lives outside this app dir as raw TS. Next compiles it with SWC.
  // See README "Shared types".
  experimental: {
    externalDir: true,
  },
  images: {
    // Serve modern formats (AVIF first, WebP fallback) and cache optimized
    // variants for a day — campaign covers / avatars rarely change.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      // Cloudinary-hosted media (avatars/logos/campaign covers/portfolio/submissions).
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Stock imagery used by the marketing site / blog.
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },
    ],
  },
};

module.exports = nextConfig;
