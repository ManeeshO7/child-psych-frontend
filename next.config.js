/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  // API is proxied by app/api/[...path]/route.ts so cookies are forwarded to the backend
  // (rewrites do not always forward Cookie when proxying to an external URL)
};

module.exports = nextConfig;
