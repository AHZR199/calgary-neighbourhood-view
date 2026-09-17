import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: {
    // cached deploys reused an older stylesheet after the font changed
    turbopackFileSystemCacheForBuild: false,
  },
  // keep local env files out of deployed functions
  outputFileTracingExcludes: {
    '/*': ['**/.env*'],
    'next-server': ['**/.env*'],
  },
};

export default nextConfig;
