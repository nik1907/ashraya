import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB — raise to 10 MB so volunteers can attach documents/photos.
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
