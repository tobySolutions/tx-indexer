"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Shield } from "lucide-react";
import { usePrivacyCash } from "@/hooks/use-privacy-cash";
import { usePrivateSwap } from "@/hooks/use-private-swap";
import { useUnifiedWallet } from "@/hooks/use-unified-wallet";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useWalletLabels } from "@/hooks/use-wallet-labels";
import {
  PRIVACY_CASH_SUPPORTED_TOKENS,
  PRIVACY_CASH_TOKEN_LIST,
  type PrivacyCashToken,
} from "@/lib/privacy/constants";
import {
  ProcessingOverlay,
  SuccessState,
  ErrorState,
  SwapSuccessState,
  SwapErrorState,
  HubTabs,
  SwapProgress,
  RecoveryBanner,
  TransferTab,
  SwapTab,
  type HubTab,
  type OperationMode,
  type SwapStep,
  type PrivacyDrawerProps,
} from "./drawer";
import { usePrivacyDebug } from "@/components/dev/privacy-debug-provider";

export function PrivacyDrawer({
  open,
  onOpenChange,
  onSuccess,
}: PrivacyDrawerProps) {
  const { address: walletAddress, status: walletStatus } = useUnifiedWallet();
  const { balance: dashboardBalance, refetch: refetchDashboardBalance } =
    useDashboardData(walletAddress);
  const { labelsList } = useWalletLabels();
  const {
    privateBalance,
    isLoadingBalance,
    status,
    isProcessing,
    isInitialized,
    signature,
    error,
    initialize,
    shield,
    unshield,
    refreshBalance,
    reset,
    getClient,
  } = usePrivacyCash();

  // Hub state
  const [activeTab, setActiveTab] = useState<HubTab>("transfer");

  // Transfer state
  const [mode, setMode] = useState<OperationMode>("deposit");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [selectedToken, setSelectedToken] = useState<PrivacyCashToken>("USDC");
  const [isTopUpFlow, setIsTopUpFlow] = useState(false);
  const [walletBalanceAdjustment, setWalletBalanceAdjustment] = useState(0);
  const [privateBalanceAdjustment, setPrivateBalanceAdjustment] = useState(0);
  const prevRawWalletBalanceRef = useRef<number | null>(null);
  const prevRawPrivateBalanceRef = useRef<number | null>(null);

  // All private balances for asset selector dropdown
  const [allPrivateBalances, setAllPrivateBalances] = useState<
    Record<PrivacyCashToken, number>
  >({
    SOL: 0,
    USDC: 0,
    USDT: 0,
  });
  const [isLoadingAllPrivateBalances, setIsLoadingAllPrivateBalances] =
    useState(false);

  // Swap state
  const [swapFromToken, setSwapFromToken] = useState<PrivacyCashToken>("SOL");
  const [swapToToken, setSwapToToken] = useState<PrivacyCashToken>("USDC");
  const [swapAmount, setSwapAmount] = useState("");

  // Use the real private swap hook
  const {
    state: swapStateRaw,
    isSwapping: isPrivateSwapping,
    estimatedOutput: swapEstimatedOutput,
    isLoadingQuote,
    isBelowMinimum,
    minimumAmount,
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
    reset: resetSwap,
  } = usePrivateSwap();
  const {
    enabled: debugEnabled,
    state: debugState,
    update: updateDebugState,
  } = usePrivacyDebug();

  // Store values at submission time for use in success effect
  const submittedValuesRef = useRef<{
    amount: number;
    mode: OperationMode;
  } | null>(null);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const isConnected = walletStatus === "connected";
  const amountNum = parseFloat(amount) || 0;
  const effectiveTab =
    debugEnabled && (debugState.swapStep || debugState.showRecovery)
      ? "swap"
      : activeTab;
  const showTransferResultState =
    effectiveTab === "transfer" && (status === "success" || status === "error");
  const swapState = debugState.swapStep
    ? {
        ...swapStateRaw,
        step: debugState.swapStep,
        errorCode: debugState.swapErrorCode ?? swapStateRaw.errorCode,
        error: debugState.swapErrorMessage || swapStateRaw.error,
      }
    : swapStateRaw;
  const effectiveIsSwapping = debugState.swapStep
    ? !["idle", "success", "error"].includes(debugState.swapStep)
    : isPrivateSwapping;
  const debugRecoverySession = debugState.showRecovery
    ? {
        id: "debug",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fromToken: "SOL" as PrivacyCashToken,
        toToken: "USDC" as PrivacyCashToken,
        amount: 1,
        step: "error" as SwapStep,
        withdrawSignature: null,
        swapSignature: null,
        depositSignature: null,
        lastErrorCode: debugState.recoveryErrorCode,
        lastErrorMessage: debugState.recoveryErrorMessage,
        lastErrorAt: Date.now(),
        ephemeralPublicKey:
          debugState.recoveryAddress ||
          "9FhY4n3fJ4m9eP8wEZsL3nq4T4zZkYx8B1tVJmTz4mQe",
        ephemeralSecretKey: "",
      }
    : null;
  const effectiveRecoverySession = debugRecoverySession ?? recoverySession;
  const effectiveRecoveryStatus =
    debugEnabled && debugState.showRecovery
      ? debugState.recoveryStatus || recoveryStatus
      : recoveryStatus;
  const effectiveIsRecovering =
    debugEnabled && debugState.showRecovery
      ? debugState.isRecovering
      : isRecovering;
  const showSwapResultState =
    effectiveTab === "swap" &&
    (swapState.step === "success" || swapState.step === "error");
  const isSwapping = effectiveIsSwapping;
  const needsTopUpInSwap = swapState.errorCode === "insufficient_sol";
  const needsTopUpInRecovery =
    effectiveRecoverySession?.lastErrorCode === "insufficient_sol";
  const recoveryRecipient = effectiveRecoverySession?.ephemeralPublicKey ?? "";

  const tokenConfig = PRIVACY_CASH_SUPPORTED_TOKENS[selectedToken];
  const rawWalletBalance =
    selectedToken === "SOL"
      ? (dashboardBalance?.sol.ui ?? 0)
      : (dashboardBalance?.tokens.find((t) => t.mint === tokenConfig.mint)
          ?.amount.ui ?? 0);

  // Apply optimistic adjustments for immediate feedback
  const walletBalance = Math.max(0, rawWalletBalance + walletBalanceAdjustment);

  const rawPrivateBalance = privateBalance?.amount ?? 0;
  const privateBalanceAmount = Math.max(
    0,
    rawPrivateBalance + privateBalanceAdjustment,
  );

  // Calculate private balances for swap and asset selector
  // Use allPrivateBalances state, with the currently selected token's balance updated
  const privateBalances: Record<PrivacyCashToken, number> = {
    ...allPrivateBalances,
    [selectedToken]: privateBalanceAmount,
  };

  // Reset balance adjustments when real balances change
  useEffect(() => {
    if (
      prevRawWalletBalanceRef.current !== null &&
      prevRawWalletBalanceRef.current !== rawWalletBalance
    ) {
      setWalletBalanceAdjustment(0);
    }
    if (
      prevRawPrivateBalanceRef.current !== null &&
      prevRawPrivateBalanceRef.current !== rawPrivateBalance
    ) {
      setPrivateBalanceAdjustment(0);
    }
    prevRawWalletBalanceRef.current = rawWalletBalance;
    prevRawPrivateBalanceRef.current = rawPrivateBalance;
  }, [rawWalletBalance, rawPrivateBalance]);

  useEffect(() => {
    if (open && isConnected && !isInitialized) {
      initialize();
    }
  }, [open, isConnected, isInitialized, initialize]);

  useEffect(() => {
    if (open && isInitialized) {
      refreshBalance(selectedToken);
    }
  }, [open, isInitialized, refreshBalance, selectedToken]);

  useEffect(() => {
    if (!open || activeTab !== "swap" || !isInitialized) return;
    const client = getClient();
    if (!client) return;
    loadRecoverySession(client);
  }, [open, activeTab, isInitialized, getClient, loadRecoverySession]);

  // Fetch all private balances when in withdraw mode (for asset selector dropdown)
  useEffect(() => {
    if (!open || !isInitialized || mode !== "withdraw") return;

    const client = getClient();
    if (!client) return;

    let cancelled = false;

    const fetchAllBalances = async () => {
      setIsLoadingAllPrivateBalances(true);

      // Fetch balances for all tokens in parallel
      const results = await Promise.allSettled(
        PRIVACY_CASH_TOKEN_LIST.map(async (token) => {
          const balance = await client.getBalance(token);
          return { token, amount: balance.amount };
        }),
      );

      // Avoid state update if effect was cleaned up
      if (cancelled) return;

      const balances: Record<PrivacyCashToken, number> = {
        SOL: 0,
        USDC: 0,
        USDT: 0,
      };

      for (const result of results) {
        if (result.status === "fulfilled") {
          balances[result.value.token] = result.value.amount;
        }
      }

      setAllPrivateBalances(balances);
      setIsLoadingAllPrivateBalances(false);
    };

    fetchAllBalances();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getClient is stable via ref
  }, [open, isInitialized, mode]);

  useEffect(() => {
    if (status === "success" && submittedValuesRef.current) {
      const { amount, mode: submittedMode } = submittedValuesRef.current;

      // Apply optimistic balance adjustments for immediate feedback
      if (submittedMode === "deposit") {
        setWalletBalanceAdjustment(-amount);
        setPrivateBalanceAdjustment(amount);
      } else {
        // send mode - private balance goes down
        setPrivateBalanceAdjustment(-amount);
      }

      // Refresh both wallet and private balance after successful operation
      // Use silent mode to avoid overwriting the success status
      refreshBalance(selectedToken, true);
      refetchDashboardBalance();

      const callbackTimer = setTimeout(() => onSuccessRef.current?.(), 2000);
      return () => clearTimeout(callbackTimer);
    }
  }, [status, refreshBalance, refetchDashboardBalance, selectedToken]);

  // Fetch real quote when swap params change
  useEffect(() => {
    if (activeTab !== "swap") return;

    const amount = parseFloat(swapAmount) || 0;
    getQuote(swapFromToken, swapToToken, amount);
  }, [activeTab, swapAmount, swapFromToken, swapToToken, getQuote]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || isProcessing || amountNum <= 0) return;

      // Store values at submission time for use in success effect
      submittedValuesRef.current = { amount: amountNum, mode };

      if (mode === "deposit") {
        await shield({ amount: amountNum, token: selectedToken });
      } else {
        if (!recipientAddress) return;
        await unshield({
          amount: amountNum,
          token: selectedToken,
          recipientAddress,
        });
      }
    },
    [
      isConnected,
      isProcessing,
      amountNum,
      mode,
      selectedToken,
      recipientAddress,
      shield,
      unshield,
    ],
  );

  const handleSwapSubmit = useCallback(async () => {
    if (!isConnected || isSwapping) return;

    const swapAmountNum = parseFloat(swapAmount) || 0;
    if (swapAmountNum <= 0 || isBelowMinimum) return;

    const client = getClient();
    if (!client) {
      console.error("[PrivacyDrawer] Cannot swap: client not available");
      return;
    }

    await executeSwap(client, swapFromToken, swapToToken, swapAmountNum);
  }, [
    isConnected,
    isSwapping,
    swapAmount,
    isBelowMinimum,
    getClient,
    executeSwap,
    swapFromToken,
    swapToToken,
  ]);

  const handleClose = useCallback(() => {
    setAmount("");
    setRecipientAddress(walletAddress || "");
    setWalletBalanceAdjustment(0);
    setPrivateBalanceAdjustment(0);
    setSwapAmount("");
    resetSwap();
    reset();
    onOpenChange(false);
  }, [walletAddress, reset, resetSwap, onOpenChange]);

  const handleSetMax = useCallback(() => {
    if (mode === "deposit") {
      const maxAmount =
        selectedToken === "SOL"
          ? Math.max(0, walletBalance - 0.01)
          : walletBalance;
      setAmount(String(maxAmount));
    } else {
      setAmount(String(privateBalanceAmount));
    }
  }, [mode, walletBalance, privateBalanceAmount, selectedToken]);

  const handleTokenSelect = useCallback((token: PrivacyCashToken) => {
    setSelectedToken(token);
    setAmount("");
    setIsTopUpFlow(false);
  }, []);

  const handleModeChange = useCallback((newMode: OperationMode) => {
    setMode(newMode);
    setAmount("");
    setIsTopUpFlow(false);
  }, []);

  const handleTabChange = useCallback(
    (tab: HubTab) => {
      setActiveTab(tab);
      if (tab !== "transfer") {
        setIsTopUpFlow(false);
      }
      if (tab === "swap") {
        // Swap only supports SOL -> SPL, ensure we show SOL balance
        setSelectedToken("SOL");
      } else {
        // Clear swap state when switching away
        setSwapAmount("");
        resetSwap();
      }
    },
    [resetSwap],
  );

  const handleSwapDirection = useCallback(() => {
    setSwapFromToken(swapToToken);
    setSwapToToken(swapFromToken);
    setSwapAmount("");
    // Will trigger getQuote via effect
  }, [swapFromToken, swapToToken]);

  const handleSwapReset = useCallback(() => {
    resetSwap();
  }, [resetSwap]);

  const handleRecoverFunds = useCallback(async () => {
    const client = getClient();
    if (!client || isRecovering) return;
    if (debugEnabled && debugState.showRecovery) return;
    await recoverFunds(client);
  }, [getClient, recoverFunds, isRecovering]);

  const handleDismissRecovery = useCallback(async () => {
    if (debugEnabled && debugState.showRecovery) {
      updateDebugState({
        showRecovery: false,
        isRecovering: false,
        recoveryStatus: "",
        recoveryErrorCode: null,
        recoveryErrorMessage: "",
      });
      return;
    }
    const client = getClient();
    if (!client || isRecovering) return;
    await clearRecoverySession(client);
  }, [
    clearRecoverySession,
    debugEnabled,
    debugState.showRecovery,
    getClient,
    isRecovering,
    updateDebugState,
  ]);

  const handleTopUp = useCallback(() => {
    if (!recoveryRecipient) return;
    setActiveTab("transfer");
    setMode("withdraw");
    setSelectedToken("SOL");
    setRecipientAddress(recoveryRecipient);
    setAmount("0.01");
    setIsTopUpFlow(true);
  }, [recoveryRecipient]);

  const insufficientBalance =
    mode === "deposit"
      ? amountNum > walletBalance
      : amountNum > privateBalanceAmount;

  const isTransferFormValid =
    amountNum > 0 &&
    !insufficientBalance &&
    (mode === "deposit" || recipientAddress.length > 0);

  const swapAmountNum = parseFloat(swapAmount) || 0;
  const swapInsufficientBalance =
    swapAmountNum > (privateBalances[swapFromToken] ?? 0);
  const isSwapFormValid =
    swapAmountNum > 0 &&
    !swapInsufficientBalance &&
    !isBelowMinimum &&
    swapEstimatedOutput !== "";

  const recoveryBanner = (
    <RecoveryBanner
      isLoading={isLoadingRecovery}
      isSwapping={isSwapping}
      isRecovering={effectiveIsRecovering}
      needsTopUp={needsTopUpInRecovery}
      recoverySession={effectiveRecoverySession}
      recoveryError={recoveryError}
      recoveryStatus={effectiveRecoveryStatus}
      onRecover={handleRecoverFunds}
      onDismiss={handleDismissRecovery}
      onTopUp={handleTopUp}
    />
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="flex flex-col"
        preventClose={isProcessing || isSwapping}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Shield className="h-4 w-4 text-purple-500" aria-hidden="true" />
            </div>
            Privacy
          </SheetTitle>
          <SheetDescription>Your funds, hidden from view</SheetDescription>
        </SheetHeader>

        {/* Transfer processing overlay */}
        {effectiveTab === "transfer" && isProcessing && (
          <ProcessingOverlay status={status} mode={mode} />
        )}

        {/* Swap processing overlay */}
        {effectiveTab === "swap" && isSwapping && (
          <SwapProgress currentStep={swapState.step} />
        )}

        {/* Transfer success state */}
        {effectiveTab === "transfer" && status === "success" && signature && (
          <SuccessState
            mode={mode}
            amount={amountNum}
            token={selectedToken}
            recipientAddress={recipientAddress}
            signature={signature}
            walletAddress={walletAddress}
            onClose={handleClose}
          />
        )}

        {/* Transfer error state */}
        {effectiveTab === "transfer" && status === "error" && (
          <ErrorState error={error} onClose={handleClose} onRetry={reset} />
        )}

        {/* Swap success state */}
        {effectiveTab === "swap" && swapState.step === "success" && (
          <SwapSuccessState
            fromAmount={swapState.inputAmount}
            fromToken={swapFromToken}
            toAmount={swapState.outputAmount}
            toToken={swapToToken}
            onClose={handleClose}
          />
        )}

        {/* Swap error state */}
        {effectiveTab === "swap" && swapState.step === "error" && (
          <SwapErrorState
            error={swapState.error}
            onClose={handleClose}
            onRetry={handleSwapReset}
            onTopUp={needsTopUpInSwap ? handleTopUp : undefined}
            topUpLabel="Add SOL"
            description={
              swapState.errorCode === "insufficient_sol"
                ? "We need a tiny amount of SOL to finish this swap. Add SOL and try again."
                : "Your funds are safe and can be recovered from the swap tab."
            }
          />
        )}

        {/* Main content */}
        {!showTransferResultState && !showSwapResultState && !isSwapping && (
          <div className="flex flex-col flex-1 mt-6">
            <div className="space-y-4 flex-1">
              {/* Hub tabs */}
              <HubTabs activeTab={effectiveTab} onTabChange={handleTabChange} />

              {/* Transfer tab content */}
              {effectiveTab === "transfer" && (
                <TransferTab
                  mode={mode}
                  selectedToken={selectedToken}
                  walletBalance={walletBalance}
                  privateBalance={privateBalanceAmount}
                  dashboardBalance={dashboardBalance}
                  privateBalances={privateBalances}
                  isLoadingPrivateBalances={isLoadingAllPrivateBalances}
                  isLoadingBalance={isLoadingBalance}
                  amount={amount}
                  insufficientBalance={insufficientBalance}
                  recipientAddress={recipientAddress}
                  walletAddress={walletAddress}
                  labelsList={labelsList}
                  isTopUpFlow={isTopUpFlow}
                  isConnected={isConnected}
                  isProcessing={isProcessing}
                  isTransferFormValid={isTransferFormValid}
                  onModeChange={handleModeChange}
                  onTokenSelect={handleTokenSelect}
                  onAmountChange={setAmount}
                  onSetMax={handleSetMax}
                  onRecipientChange={setRecipientAddress}
                  onClose={handleClose}
                  onSubmit={handleSubmit}
                />
              )}

              {/* Swap tab content */}
              {effectiveTab === "swap" && (
                <SwapTab
                  swapFromToken={swapFromToken}
                  swapToToken={swapToToken}
                  swapAmount={swapAmount}
                  swapEstimatedOutput={swapEstimatedOutput}
                  privateBalances={privateBalances}
                  isLoadingQuote={isLoadingQuote}
                  isBelowMinimum={isBelowMinimum}
                  minimumAmount={minimumAmount}
                  isConnected={isConnected}
                  isSwapFormValid={isSwapFormValid}
                  onFromTokenChange={setSwapFromToken}
                  onToTokenChange={setSwapToToken}
                  onAmountChange={setSwapAmount}
                  onSwapDirection={handleSwapDirection}
                  onSwapSubmit={handleSwapSubmit}
                  onClose={handleClose}
                  recoveryBanner={recoveryBanner}
                />
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
