import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // keep local env files out of deployed functions
  outputFileTracingExcludes: {
    '/*': ['**/.env*'],
    'next-server': ['**/.env*'],
  },
};

export default nextConfig;
