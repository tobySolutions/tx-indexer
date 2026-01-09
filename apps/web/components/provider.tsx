"use client";

import type { SolanaClientConfig } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
import type { PropsWithChildren } from "react";

const defaultConfig: SolanaClientConfig = {
  // Use public RPC URL for client-side wallet operations (domain-restricted key)
  endpoint: process.env.NEXT_PUBLIC_RPC_URL!,
};

export function Providers({ children }: PropsWithChildren) {
  return <SolanaProvider config={defaultConfig}>{children}</SolanaProvider>;
}
