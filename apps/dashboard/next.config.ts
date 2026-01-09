import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No need to expose RPC_URL - it's automatically available in server actions
  // NEXT_PUBLIC_* vars are automatically exposed to the client
};

export default nextConfig;
