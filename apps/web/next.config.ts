/** @type {import('next').NextConfig} */
const nextConfig = {
  // No need to expose server env vars - they're automatically available in server components
  // NEXT_PUBLIC_* vars are automatically exposed to the client
  transpilePackages: [
    "tx-indexer",
    "@tx-indexer/core",
    "@tx-indexer/solana",
    "@tx-indexer/classification",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.helius-rpc.com",
      },
      {
        protocol: "https",
        hostname: "**.arweave.net",
      },
      {
        protocol: "https",
        hostname: "arweave.net",
      },
      {
        protocol: "https",
        hostname: "**.ipfs.io",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "nftstorage.link",
      },
    ],
  },
};

export default nextConfig;
