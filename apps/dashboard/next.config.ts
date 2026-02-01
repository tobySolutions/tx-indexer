import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  serverExternalPackages: ["@lightprotocol/hasher.rs", "privacycash"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.helius-rpc.com",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
      },
      {
        protocol: "https",
        hostname: "*.arweave.net",
      },
      {
        protocol: "https",
        hostname: "nftstorage.link",
      },
    ],
  },
};

// Wrap with bundle analyzer when ANALYZE=true
// Usage: ANALYZE=true npm run build
// First install: npm install --save-dev @next/bundle-analyzer
const withBundleAnalyzer = async (config: NextConfig): Promise<NextConfig> => {
  if (process.env.ANALYZE === "true") {
    try {
      const bundleAnalyzer = await import("@next/bundle-analyzer");
      return bundleAnalyzer.default({
        enabled: true,
        openAnalyzer: true,
      })(config);
    } catch {
      console.warn(
        "Bundle analyzer not installed. Run: npm install --save-dev @next/bundle-analyzer",
      );
      return config;
    }
  }
  return config;
};

export default withBundleAnalyzer(nextConfig);
