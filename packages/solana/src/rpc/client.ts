import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  type Rpc,
  type RpcSubscriptions,
  address,
  type Address,
  signature,
  type Signature,
} from "@solana/kit";

export interface SolanaClient {
  rpc: Rpc<any>;
  rpcSubscriptions: RpcSubscriptions<any>;
}

/**
 * Creates a Solana RPC client with both regular RPC and WebSocket subscriptions.
 * 
 * @param rpcUrl - HTTP RPC endpoint URL
 * @param wsUrl - Optional WebSocket URL (defaults to rpcUrl with wss:// protocol)
 */
export function createSolanaClient(
  rpcUrl: string,
  wsUrl?: string
): SolanaClient {
  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = wsUrl
    ? createSolanaRpcSubscriptions(wsUrl)
    : createSolanaRpcSubscriptions(rpcUrl.replace("https://", "wss://"));

  return { rpc, rpcSubscriptions };
}

/**
 * Parses and validates a Solana address string.
 * 
 * @param addr - Base58-encoded Solana address
 */
export function parseAddress(addr: string): Address {
  return address(addr);
}

/**
 * Parses and validates a Solana transaction signature string.
 * 
 * @param sig - Base58-encoded transaction signature
 */
export function parseSignature(sig: string): Signature {
  return signature(sig);
}

