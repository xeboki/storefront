/**
 * Next 14 does not load a TypeScript config — support for `next.config.ts`
 * arrived in Next 15, and until this file replaced it the build failed before
 * compiling anything, with every other error in the project hidden behind it.
 *
 * The options below are Next 14's own (`experimental.serverComponentsExternalPackages`
 * was renamed in 15), so the config was written for the installed version and
 * only its extension was wrong.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
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
