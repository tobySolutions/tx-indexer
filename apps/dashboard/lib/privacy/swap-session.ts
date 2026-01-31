"use client";

import type { PrivacyCashToken } from "@/lib/privacy/constants";
import { encryptJson, decryptJson } from "@/lib/privacy/crypto";

const SESSION_API = "/api/privacy/swap-session";

export type SwapRecoveryStep =
  | "idle"
  | "initializing"
  | "withdrawing"
  | "waiting_funds"
  | "quoting"
  | "swapping"
  | "confirming_swap"
  | "depositing"
  | "confirming_deposit"
  | "success"
  | "error";

export type SwapRecoveryErrorCode =
  | "insufficient_sol"
  | "simulation_failed"
  | "user_cancelled"
  | "unknown";

export interface SwapRecoveryPayload {
  id: string;
  createdAt: number;
  updatedAt: number;
  fromToken: PrivacyCashToken;
  toToken: PrivacyCashToken;
  amount: number;
  step: SwapRecoveryStep;
  withdrawSignature: string | null;
  swapSignature: string | null;
  depositSignature: string | null;
  lastErrorCode: SwapRecoveryErrorCode | null;
  lastErrorMessage: string | null;
  lastErrorAt: number | null;
  ephemeralPublicKey: string;
  ephemeralSecretKey: string;
}

interface EncryptedSwapSession {
  ciphertext: string;
  iv: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Swap session is only available in the browser");
  }
}

export async function storeSwapSession(
  publicKey: string,
  signature: Uint8Array,
  payload: SwapRecoveryPayload,
): Promise<void> {
  assertBrowser();

  const encrypted = await encryptJson(signature, payload);
  const body: EncryptedSwapSession = {
    ...encrypted,
    version: 1,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };

  const response = await fetch(SESSION_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey, session: body }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to store recovery session: ${errorText}`);
  }
}

export async function loadSwapSession(
  publicKey: string,
  signature: Uint8Array,
): Promise<SwapRecoveryPayload | null> {
  assertBrowser();

  const response = await fetch(
    `${SESSION_API}?publicKey=${encodeURIComponent(publicKey)}`,
  );
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { session?: EncryptedSwapSession };
  if (!data.session) {
    return null;
  }

  return await decryptJson<SwapRecoveryPayload>(signature, {
    ciphertext: data.session.ciphertext,
    iv: data.session.iv,
  });
}

export async function clearSwapSession(publicKey: string): Promise<void> {
  await fetch(SESSION_API, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey }),
  });
}
