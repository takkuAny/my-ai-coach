import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'efdxweejxnjlrawuqlzi.supabase.co', // ← あなたの Supabase プロジェクトに置き換え
        pathname: '/storage/**',
      },
    ],
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
}

export default nextConfig
