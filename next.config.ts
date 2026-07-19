import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-69d925864d0b4a39a1223b2185f89e5c.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-ac3f5719a94248f3a368d08d7d60d417.r2.dev",
      },
    ],
  },
  async rewrites() {
    const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
    if (!r2Url) return [];
    return [
      {
        source: "/r2/:path*",
        destination: `${r2Url}/:path*`,
      },
    ];
  },
  serverExternalPackages: ["razorpay", "jose", "jwks-rsa"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

