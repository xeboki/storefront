import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Subdomain routing handled via middleware
  // Each merchant gets {slug}.xeboki.store
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
  // Rewrite for local development: ?store=slug → subdomain emulation
  async rewrites() {
    return [];
  },
};

export default nextConfig;
