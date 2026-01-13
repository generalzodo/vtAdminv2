import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'victoriatravels.com.ng',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'admin.victoriatravels.com.ng',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

