/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!process.env.VERCEL) {
      return [
        {
          source: "/api/backend/:path*",
          destination: "http://localhost:5000/api/:path*",
        },
        {
          source: "/api/:path*",
          destination: "http://localhost:5000/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
