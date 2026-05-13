import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // Opts middleware into the Node.js runtime so Prisma Client can run inside it.
    // Stable in Next.js 15.5 but not yet in the public NextConfig types.
    // @ts-expect-error nodeMiddleware is experimental and not typed in NextConfig yet
    nodeMiddleware: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default config;
