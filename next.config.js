/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Ensure Turbopack uses the frontend folder as root (avoids bundling the whole home dir)
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  // API is proxied by app/api/[...path]/route.ts so cookies are forwarded to the backend
  // (rewrites do not always forward Cookie when proxying to an external URL)
};

module.exports = nextConfig;

