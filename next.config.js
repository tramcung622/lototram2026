/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Cho phép import file mp3 như module (dùng cho nhạc nền)
    config.module.rules.push({
      test: /\.mp3$/i,
      type: 'asset/resource',
    })
    return config
  },
}

module.exports = nextConfig
