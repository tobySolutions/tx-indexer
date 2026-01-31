"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { PrivacyCashClient } from "@/lib/privacy/privacy-cash-client";
import {
  createEphemeralKeypair,
  deserializeKeypair,
  getEphemeralSolBalance,
  waitForBalance,
  getEphemeralTokenBalance,
  isBalanceSufficientForSwap,
  serializeKeypair,
} from "@/lib/privacy/ephemeral-wallet";
import {
  clearSwapSession,
  loadSwapSession,
  storeSwapSession,
  type SwapRecoveryErrorCode,
  type SwapRecoveryPayload,
} from "@/lib/privacy/swap-session";
import {
  PRIVACY_CASH_SUPPORTED_TOKENS,
  type PrivacyCashToken,
} from "@/lib/privacy/constants";

const JUPITER_QUOTE_API = "/api/swap/quote";
const JUPITER_SWAP_API = "/api/swap/transaction";

const SOL_MINT = "So11111111111111111111111111111111111111112";

const TOKEN_MINTS: Record<PrivacyCashToken, string> = {
  SOL: SOL_MINT,
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

export type PrivateSwapStep =
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

export interface PrivateSwapState {
  step: PrivateSwapStep;
  error: string | null;
  errorCode: SwapRecoveryErrorCode | null;
  fromToken: PrivacyCashToken;
  toToken: PrivacyCashToken;
  inputAmount: string;
  outputAmount: string;
  withdrawSignature: string | null;
  swapSignature: string | null;
  depositSignature: string | null;
}

export interface UsePrivateSwapReturn {
  state: PrivateSwapState;
  isSwapping: boolean;
  estimatedOutput: string;
  isLoadingQuote: boolean;
  isBelowMinimum: boolean;
  minimumAmount: number;
  recoverySession: SwapRecoveryPayload | null;
  isLoadingRecovery: boolean;
  isRecovering: boolean;
  recoveryError: string | null;
  recoveryStatus: string | null;
  executeSwap: (
    client: PrivacyCashClient,
    fromToken: PrivacyCashToken,
    toToken: PrivacyCashToken,
    amount: number,
  ) => Promise<void>;
  loadRecoverySession: (client: PrivacyCashClient) => Promise<void>;
  recoverFunds: (client: PrivacyCashClient) => Promise<void>;
  clearRecoverySession: (client: PrivacyCashClient) => Promise<void>;
  getQuote: (
    fromToken: PrivacyCashToken,
    toToken: PrivacyCashToken,
    amount: number,
  ) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: PrivateSwapState = {
  step: "idle",
  error: null,
  errorCode: null,
  fromToken: "SOL",
  toToken: "USDC",
  inputAmount: "",
  outputAmount: "",
  withdrawSignature: null,
  swapSignature: null,
  depositSignature: null,
};

const MINIMUM_SWAP_AMOUNT = 0.01;
const MAX_DEPOSIT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const MIN_SOL_FOR_PROCESSING = 0.002;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUserRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("user rejected") || msg.includes("rejected");
}

function createSwapError(
  code: SwapRecoveryErrorCode,
  message: string,
): Error & { code: SwapRecoveryErrorCode } {
  const error = new Error(message) as Error & { code: SwapRecoveryErrorCode };
  error.code = code;
  return error;
}

function getSwapErrorCode(error: unknown): SwapRecoveryErrorCode {
  if (isUserRejection(error)) return "user_cancelled";
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return (error as { code: SwapRecoveryErrorCode }).code;
  }
  return "unknown";
}

function getFriendlySwapMessage(code: SwapRecoveryErrorCode): string {
  switch (code) {
    case "insufficient_sol":
      return "We need a tiny amount of SOL to cover the processing cost. Add SOL and try again.";
    case "simulation_failed":
      return "We couldn't prepare this swap. Please try again in a moment.";
    case "user_cancelled":
      return "You cancelled the request.";
    default:
      return "We couldn't finish the swap. Please try again.";
  }
}

function isInsufficientSolError(message: string): boolean {
  const lowered = message.toLowerCase();
  const hasInsufficient =
    lowered.includes("insufficient") ||
    lowered.includes("not enough") ||
    lowered.includes("insufficient funds");
  const hasFee =
    lowered.includes("fee") ||
    lowered.includes("lamports") ||
    lowered.includes("rent") ||
    lowered.includes("balance");
  return hasInsufficient && hasFee;
}

export function usePrivateSwap(): UsePrivateSwapReturn {
  const [state, setState] = useState<PrivateSwapState>(INITIAL_STATE);
  const [estimatedOutput, setEstimatedOutput] = useState("");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [currentAmount, setCurrentAmount] = useState(0);

  const quoteAbortRef = useRef<AbortController | null>(null);
  const quoteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const quoteDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const quoteRequestIdRef = useRef(0);

  const [recoverySession, setRecoverySession] =
    useState<SwapRecoveryPayload | null>(null);
  const [isLoadingRecovery, setIsLoadingRecovery] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const recoverySessionRef = useRef<SwapRecoveryPayload | null>(null);

  const isBelowMinimum =
    currentAmount > 0 && currentAmount < MINIMUM_SWAP_AMOUNT;

  useEffect(() => {
    return () => {
      if (quoteAbortRef.current) quoteAbortRef.current.abort();
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, []);

  const persistRecoverySession = useCallback(
    async (
      client: PrivacyCashClient,
      payload: SwapRecoveryPayload,
      options?: { critical?: boolean },
    ) => {
      const signatureBytes = client.getSignatureBytes();
      if (!signatureBytes) return;
      const publicKey = client.getPublicKey().toBase58();
      recoverySessionRef.current = payload;
      setRecoverySession(payload);
      try {
        await storeSwapSession(publicKey, signatureBytes, payload);
      } catch (error) {
        console.warn("[PrivateSwap] Failed to store recovery session", error);
        // If this is a critical persistence (initial session creation), rethrow
        // to abort the swap before any funds are moved
        if (options?.critical) {
          throw new Error(
            "Could not save recovery data. Please try again in a moment.",
          );
        }
      }
    },
    [],
  );

  const updateRecoverySession = useCallback(
    async (
      client: PrivacyCashClient,
      updates: Partial<SwapRecoveryPayload>,
    ) => {
      if (!recoverySessionRef.current) return;
      const payload: SwapRecoveryPayload = {
        ...recoverySessionRef.current,
        ...updates,
        updatedAt: Date.now(),
      };
      await persistRecoverySession(client, payload);
    },
    [persistRecoverySession],
  );

  const loadRecoverySession = useCallback(async (client: PrivacyCashClient) => {
    setIsLoadingRecovery(true);
    setRecoveryError(null);
    try {
      const signatureBytes = client.getSignatureBytes();
      if (!signatureBytes) {
        setIsLoadingRecovery(false);
        return;
      }
      const publicKey = client.getPublicKey().toBase58();
      const session = await loadSwapSession(publicKey, signatureBytes);
      const normalized = session
        ? {
            ...session,
            lastErrorCode: session.lastErrorCode ?? null,
            lastErrorMessage: session.lastErrorMessage ?? null,
            lastErrorAt: session.lastErrorAt ?? null,
          }
        : null;
      recoverySessionRef.current = normalized;
      setRecoverySession(normalized);
    } catch (error) {
      console.error("[PrivateSwap] Failed to load recovery session", error);
    } finally {
      setIsLoadingRecovery(false);
    }
  }, []);

  const clearRecoverySession = useCallback(
    async (client: PrivacyCashClient) => {
      const publicKey = client.getPublicKey().toBase58();
      await clearSwapSession(publicKey);
      recoverySessionRef.current = null;
      setRecoverySession(null);
      setRecoveryError(null);
      setRecoveryStatus(null);
    },
    [],
  );

  const recoverFunds = useCallback(
    async (client: PrivacyCashClient) => {
      const session = recoverySessionRef.current;
      if (!session) return;

      setIsRecovering(true);
      setRecoveryError(null);
      setRecoveryStatus("Checking the temporary wallet...");

      try {
        if (!client.isInitialized) {
          await client.initialize();
        }
        const keypair = deserializeKeypair({
          publicKey: session.ephemeralPublicKey,
          secretKey: session.ephemeralSecretKey,
        });
        const connection = client.getConnection();

        const balances: Array<{ token: PrivacyCashToken; amount: number }> = [];
        const solBalance = await getEphemeralSolBalance(
          connection,
          keypair.publicKey,
        );
        if (solBalance > 0) {
          balances.push({ token: "SOL", amount: solBalance });
        }

        const usdcMint = new (await import("@solana/web3.js")).PublicKey(
          TOKEN_MINTS.USDC,
        );
        const usdtMint = new (await import("@solana/web3.js")).PublicKey(
          TOKEN_MINTS.USDT,
        );

        const usdcBalance = await getEphemeralTokenBalance(
          connection,
          keypair.publicKey,
          usdcMint,
        );
        if (usdcBalance > 0) {
          balances.push({ token: "USDC", amount: usdcBalance });
        }

        const usdtBalance = await getEphemeralTokenBalance(
          connection,
          keypair.publicKey,
          usdtMint,
        );
        if (usdtBalance > 0) {
          balances.push({ token: "USDT", amount: usdtBalance });
        }

        if (balances.length === 0) {
          setRecoveryError("No funds found in the recovery wallet.");
          setRecoveryStatus(null);
          return;
        }

        if (solBalance < MIN_SOL_FOR_PROCESSING) {
          setRecoveryError(
            "We need a tiny amount of SOL to bring your funds back. Add SOL and try again.",
          );
          setRecoveryStatus(null);
          await updateRecoverySession(client, {
            lastErrorCode: "insufficient_sol",
            lastErrorMessage:
              "We need a tiny amount of SOL to bring your funds back. Add SOL and try again.",
            lastErrorAt: Date.now(),
          });
          return;
        }

        await updateRecoverySession(client, { step: "depositing" });

        for (const entry of balances) {
          setRecoveryStatus(`Sending ${entry.amount} ${entry.token}...`);
          const depositResult = await client.depositFromEphemeral(
            entry.amount,
            entry.token,
            keypair,
          );
          setRecoveryStatus("Confirming transfer...");
          await connection.confirmTransaction(
            depositResult.signature,
            "confirmed",
          );
        }

        setRecoveryStatus("All set. Funds are back in private balance.");
        await clearRecoverySession(client);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to recover funds.";
        setRecoveryError(message);
        setRecoveryStatus(null);
        await updateRecoverySession(client, {
          lastErrorCode: "unknown",
          lastErrorMessage: message,
          lastErrorAt: Date.now(),
        });
      } finally {
        setIsRecovering(false);
      }
    },
    [clearRecoverySession, updateRecoverySession],
  );

  const getQuote = useCallback(
    async (
      fromToken: PrivacyCashToken,
      toToken: PrivacyCashToken,
      amount: number,
    ) => {
      if (quoteAbortRef.current) quoteAbortRef.current.abort();
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);

      if (!amount || amount <= 0) {
        setEstimatedOutput("");
        setCurrentAmount(0);
        return;
      }

      setCurrentAmount(amount);

      if (!isBalanceSufficientForSwap(amount)) {
        setEstimatedOutput("");
        return;
      }

      const fetchQuote = async () => {
        const controller = new AbortController();
        quoteAbortRef.current = controller;

        setIsLoadingQuote(true);

        try {
          const inputMint = TOKEN_MINTS[fromToken];
          const outputMint = TOKEN_MINTS[toToken];
          const decimals = PRIVACY_CASH_SUPPORTED_TOKENS[fromToken].decimals;
          const rawAmount = Math.floor(amount * Math.pow(10, decimals));

          const params = new URLSearchParams({
            inputMint,
            outputMint,
            amount: rawAmount.toString(),
          });

          const response = await fetch(`${JUPITER_QUOTE_API}?${params}`, {
            signal: controller.signal,
          });

          if (!response.ok) throw new Error("Failed to get quote");

          const quoteData = await response.json();
          const outputDecimals =
            PRIVACY_CASH_SUPPORTED_TOKENS[toToken].decimals;
          const outputAmount =
            parseInt(quoteData.outAmount) / Math.pow(10, outputDecimals);

          setEstimatedOutput(outputAmount.toFixed(toToken === "SOL" ? 6 : 2));
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          setEstimatedOutput("");
        } finally {
          setIsLoadingQuote(false);
        }
      };

      const requestId = ++quoteRequestIdRef.current;

      quoteDebounceRef.current = setTimeout(async () => {
        if (requestId !== quoteRequestIdRef.current) return;
        await fetchQuote();
        if (requestId !== quoteRequestIdRef.current) return;
        quoteIntervalRef.current = setInterval(fetchQuote, 15000);
      }, 400);
    },
    [],
  );

  const executeSwap = useCallback(
    async (
      client: PrivacyCashClient,
      fromToken: PrivacyCashToken,
      toToken: PrivacyCashToken,
      amount: number,
    ) => {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
        quoteIntervalRef.current = null;
      }

      let ephemeralKeypair: Keypair | null = null;

      setState((s) => ({
        ...s,
        step: "initializing",
        error: null,
        errorCode: null,
        fromToken,
        toToken,
        inputAmount: amount.toString(),
        outputAmount: "",
        withdrawSignature: null,
        swapSignature: null,
        depositSignature: null,
      }));

      try {
        if (!client.isInitialized) {
          await client.initialize();
        }

        ephemeralKeypair = createEphemeralKeypair();
        const sessionId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        const createdAt = Date.now();
        const serializedKeypair = serializeKeypair(ephemeralKeypair);
        // Critical: must persist session before moving any funds
        // If this fails, we abort the swap to prevent fund loss
        await persistRecoverySession(
          client,
          {
            id: sessionId,
            createdAt,
            updatedAt: createdAt,
            fromToken,
            toToken,
            amount,
            step: "initializing",
            withdrawSignature: null,
            swapSignature: null,
            depositSignature: null,
            lastErrorCode: null,
            lastErrorMessage: null,
            lastErrorAt: null,
            ephemeralPublicKey: serializedKeypair.publicKey,
            ephemeralSecretKey: serializedKeypair.secretKey,
          },
          { critical: true },
        );
        const connection = client.getConnection();

        setState((s) => ({ ...s, step: "withdrawing" }));
        await updateRecoverySession(client, { step: "withdrawing" });

        const withdrawResult = await client.withdrawForSwap(
          amount,
          ephemeralKeypair.publicKey,
        );

        setState((s) => ({
          ...s,
          step: "waiting_funds",
          withdrawSignature: withdrawResult.signature,
        }));
        await updateRecoverySession(client, {
          step: "waiting_funds",
          withdrawSignature: withdrawResult.signature,
        });

        const fundsArrived = await waitForBalance(
          connection,
          ephemeralKeypair.publicKey,
          withdrawResult.netAmount,
          undefined,
          30,
          2000,
        );

        if (!fundsArrived) {
          throw new Error("Withdrawal timed out. Please try again.");
        }

        setState((s) => ({ ...s, step: "quoting" }));
        await updateRecoverySession(client, { step: "quoting" });

        const inputMint = TOKEN_MINTS[fromToken];
        const outputMint = TOKEN_MINTS[toToken];
        const decimals = PRIVACY_CASH_SUPPORTED_TOKENS[fromToken].decimals;
        const rawAmount = Math.floor(
          withdrawResult.netAmount * Math.pow(10, decimals),
        );

        const quoteParams = new URLSearchParams({
          inputMint,
          outputMint,
          amount: rawAmount.toString(),
        });

        const quoteResponse = await fetch(
          `${JUPITER_QUOTE_API}?${quoteParams}`,
        );
        if (!quoteResponse.ok) throw new Error("Failed to get swap quote");

        const quoteData = await quoteResponse.json();

        setState((s) => ({ ...s, step: "swapping" }));
        await updateRecoverySession(client, { step: "swapping" });

        const swapResponse = await fetch(JUPITER_SWAP_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: ephemeralKeypair.publicKey.toString(),
          }),
        });

        if (!swapResponse.ok)
          throw new Error("Failed to build swap transaction");

        const swapData = await swapResponse.json();

        if (!swapData.swapTransaction) {
          throw new Error("No swap transaction returned");
        }

        const transactionBytes = Uint8Array.from(
          atob(swapData.swapTransaction),
          (c) => c.charCodeAt(0),
        );

        const transaction = VersionedTransaction.deserialize(transactionBytes);
        transaction.sign([ephemeralKeypair]);

        const feeBalance = await getEphemeralSolBalance(
          connection,
          ephemeralKeypair.publicKey,
        );
        if (feeBalance < MIN_SOL_FOR_PROCESSING) {
          throw createSwapError(
            "insufficient_sol",
            getFriendlySwapMessage("insufficient_sol"),
          );
        }

        const simulation = await connection.simulateTransaction(transaction, {
          sigVerify: false,
        });
        if (simulation.value.err) {
          const logs = simulation.value.logs?.join(" ") ?? "";
          const details = `${JSON.stringify(simulation.value.err)} ${logs}`;
          if (isInsufficientSolError(details)) {
            throw createSwapError(
              "insufficient_sol",
              getFriendlySwapMessage("insufficient_sol"),
            );
          }
          throw createSwapError(
            "simulation_failed",
            getFriendlySwapMessage("simulation_failed"),
          );
        }

        const swapSignature = await connection.sendRawTransaction(
          transaction.serialize(),
          { skipPreflight: false, preflightCommitment: "confirmed" },
        );

        setState((s) => ({
          ...s,
          step: "confirming_swap",
          swapSignature,
        }));
        await updateRecoverySession(client, {
          step: "confirming_swap",
          swapSignature,
        });

        await connection.confirmTransaction(swapSignature, "confirmed");

        const outputDecimals = PRIVACY_CASH_SUPPORTED_TOKENS[toToken].decimals;
        const expectedOutput =
          parseInt(quoteData.outAmount) / Math.pow(10, outputDecimals);

        const outputMintPubkey = new (
          await import("@solana/web3.js")
        ).PublicKey(outputMint);

        const outputArrived = await waitForBalance(
          connection,
          ephemeralKeypair.publicKey,
          expectedOutput,
          outputMint === SOL_MINT ? undefined : outputMintPubkey,
          15,
          2000,
        );

        if (!outputArrived) {
          throw new Error("Swap output not received. Please contact support.");
        }

        const actualOutput =
          outputMint === SOL_MINT
            ? await getEphemeralSolBalance(
                connection,
                ephemeralKeypair.publicKey,
              )
            : await getEphemeralTokenBalance(
                connection,
                ephemeralKeypair.publicKey,
                outputMintPubkey,
              );

        setState((s) => ({
          ...s,
          step: "depositing",
          outputAmount: actualOutput.toFixed(toToken === "SOL" ? 6 : 2),
        }));
        await updateRecoverySession(client, { step: "depositing" });

        const depositFeeBalance = await getEphemeralSolBalance(
          connection,
          ephemeralKeypair.publicKey,
        );
        if (depositFeeBalance < MIN_SOL_FOR_PROCESSING) {
          throw createSwapError(
            "insufficient_sol",
            getFriendlySwapMessage("insufficient_sol"),
          );
        }

        let depositSuccess = false;
        let depositError: Error | null = null;

        for (let attempt = 0; attempt < MAX_DEPOSIT_RETRIES; attempt++) {
          try {
            const depositResult = await client.depositFromEphemeral(
              actualOutput,
              toToken,
              ephemeralKeypair,
            );

            setState((s) => ({
              ...s,
              step: "confirming_deposit",
              depositSignature: depositResult.signature,
            }));
            await updateRecoverySession(client, {
              step: "confirming_deposit",
              depositSignature: depositResult.signature,
            });

            await connection.confirmTransaction(
              depositResult.signature,
              "confirmed",
            );

            depositSuccess = true;
            break;
          } catch (err) {
            depositError =
              err instanceof Error ? err : new Error("Deposit failed");
            if (attempt < MAX_DEPOSIT_RETRIES - 1) {
              await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
            }
          }
        }

        if (!depositSuccess) {
          throw new Error(
            "Couldn't return funds to private balance. Your swapped tokens are safe. Please contact support.",
          );
        }

        setState((s) => ({ ...s, step: "success" }));
        await clearRecoverySession(client);
      } catch (err) {
        const errorCode = getSwapErrorCode(err);
        const rawMessage = err instanceof Error ? err.message : "";
        const message = isInsufficientSolError(rawMessage)
          ? getFriendlySwapMessage("insufficient_sol")
          : getFriendlySwapMessage(errorCode);

        setState((s) => ({
          ...s,
          step: "error",
          error: message,
          errorCode:
            errorCode === "unknown" && isInsufficientSolError(rawMessage)
              ? "insufficient_sol"
              : errorCode,
        }));

        await updateRecoverySession(client, {
          step: "error",
          lastErrorCode:
            errorCode === "unknown" && isInsufficientSolError(rawMessage)
              ? "insufficient_sol"
              : errorCode,
          lastErrorMessage: message,
          lastErrorAt: Date.now(),
        });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    if (quoteAbortRef.current) quoteAbortRef.current.abort();
    if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
    setState(INITIAL_STATE);
    setEstimatedOutput("");
    setIsLoadingQuote(false);
    setCurrentAmount(0);
    setRecoveryError(null);
    setRecoveryStatus(null);
  }, []);

  const isSwapping =
    state.step !== "idle" && state.step !== "success" && state.step !== "error";

  return {
    state,
    isSwapping,
    estimatedOutput,
    isLoadingQuote,
    isBelowMinimum,
    minimumAmount: MINIMUM_SWAP_AMOUNT,
    recoverySession,
    isLoadingRecovery,
    isRecovering,
    recoveryError,
    recoveryStatus,
    executeSwap,
    loadRecoverySession,
    recoverFunds,
    clearRecoverySession,
    getQuote,
    reset,
  };
}
