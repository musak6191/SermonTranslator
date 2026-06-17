const apiBaseUrl = process.env.ENV == 'production' ? '' : (process.env.VITE_API_BASE_URL || 'http://localhost:3001')

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    VITE_API_BASE_URL: apiBaseUrl,
  },
  output: 'export',
  async rewrites() {
    const base = apiBaseUrl.replace(/\/$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${base}/socket.io/:path*`,
      },
    ]
  },
}

module.exports = nextConfig