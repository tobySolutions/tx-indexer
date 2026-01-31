"use client";

import {
  Keypair,
  Connection,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";

export function createEphemeralKeypair(): Keypair {
  return Keypair.generate();
}

export function serializeKeypair(keypair: Keypair): {
  publicKey: string;
  secretKey: string;
} {
  return {
    publicKey: bs58.encode(keypair.publicKey.toBytes()),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

export function deserializeKeypair(payload: {
  publicKey: string;
  secretKey: string;
}): Keypair {
  return Keypair.fromSecretKey(bs58.decode(payload.secretKey));
}

export function signTransactionWithKeypair(
  transaction: VersionedTransaction,
  keypair: Keypair,
): VersionedTransaction {
  transaction.sign([keypair]);
  return transaction;
}

export async function getEphemeralSolBalance(
  connection: Connection,
  pubkey: PublicKey,
): Promise<number> {
  const balance = await connection.getBalance(pubkey);
  return balance / LAMPORTS_PER_SOL;
}

export async function getEphemeralTokenBalance(
  connection: Connection,
  pubkey: PublicKey,
  mintAddress: PublicKey,
): Promise<number> {
  try {
    const tokenAccounts = await connection.getTokenAccountsByOwner(pubkey, {
      mint: mintAddress,
    });

    if (tokenAccounts.value.length === 0) return 0;

    const accountInfo = tokenAccounts.value[0];
    if (!accountInfo) return 0;

    const balance = await connection.getTokenAccountBalance(accountInfo.pubkey);
    return parseFloat(balance.value.uiAmountString || "0");
  } catch {
    return 0;
  }
}

export async function waitForBalance(
  connection: Connection,
  pubkey: PublicKey,
  expectedAmount: number,
  mintAddress?: PublicKey,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const balance = mintAddress
      ? await getEphemeralTokenBalance(connection, pubkey, mintAddress)
      : await getEphemeralSolBalance(connection, pubkey);

    if (balance >= expectedAmount * 0.99) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

const MIN_SOL_FOR_FEES = 0.005;

export function estimateMinimumSwapAmount(swapFeeEstimate = 0.002): number {
  return MIN_SOL_FOR_FEES + swapFeeEstimate;
}

export function isBalanceSufficientForSwap(
  amount: number,
  withdrawFeeEstimate = 0.001,
): boolean {
  const netAmount = amount - withdrawFeeEstimate;
  return netAmount >= estimateMinimumSwapAmount();
}
