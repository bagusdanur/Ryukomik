/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    optimizePackageImports: ['react-icons', 'date-fns', 'swiper'],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  compress: true,

  ...(process.env.ANALYZE === "true" && {
    webpack: (config, { isServer }) => {
      if (isServer) {
        config.optimization = {
          ...config.optimization,
          minimize: true,
        };
      }
      return config;
    },
  }),

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/komik/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/chapter/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/:path*.rsc",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
          {
            key: "Vary",
            value: "RSC, Next-Router-State-Tree, Next-Router-Prefetch",
          },
        ],
      },
      {
        source: "/:path*.(png|jpg|jpeg|webp|gif|svg|ico|avif|css|js|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      ...[
        "/dashboard/:path*",
        "/setting/:path*",
        "/files/:path*",
        "/bookmark/:path*",
        "/history/:path*",
        "/premium/:path*",
        "/premium-pay/:path*",
        "/auth/:path*",
        "/u/:path*",
        "/api/comments",
        "/api/comment-like",
        "/api/reactions",
        "/api/xp/:path*",
      ].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      })),
      ...[
        "/search",
        "/bookmark/:path*",
        "/history/:path*",
        "/files/:path*",
        "/setting/:path*",
        "/settings/:path*",
        "/login/:path*",
        "/register/:path*",
        "/auth/:path*",
        "/dashboard/:path*",
        "/social-settings/:path*",
        "/social-controls/:path*",
        "/social-moderation/:path*",
      ].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }],
      })),
      // ✅ SW tidak di-cache lama
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },

  serverExternalPackages: ["cheerio", "pg", "@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"],
};

export default nextConfig;
