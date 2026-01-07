"use client";

import type { SolanaClientConfig } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
import type { PropsWithChildren } from "react";
import { AuthProvider } from "@/lib/auth";

const config: SolanaClientConfig = {
  endpoint: process.env.RPC_URL!,
};

export function Providers({ children }: PropsWithChildren) {
  return (
    <SolanaProvider config={config}>
      <AuthProvider>{children}</AuthProvider>
    </SolanaProvider>
  );
}
