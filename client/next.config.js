const apiBaseUrl = (process.env.NODE_ENV === 'production' || process.env.ENV === 'production') ? '' : (process.env.VITE_API_BASE_URL || 'http://localhost:3001')

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    VITE_API_BASE_URL: apiBaseUrl,
  },
  output: 'export'
}

module.exports = nextConfig