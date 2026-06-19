const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives inside the Collably monorepo (which has sibling lockfiles);
  // pin the file-tracing root to this directory so Next doesn't infer the wrong one.
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
