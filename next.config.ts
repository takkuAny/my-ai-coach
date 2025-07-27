import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'efdxweejxnjlrawuqlzi.supabase.co', // ← 必要に応じて修正
        pathname: '/storage/**',
      },
    ],
  },
  // ✅ TurboPackを完全に無効化
  turbo: {
    enabled: false,
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
}

export default nextConfig
