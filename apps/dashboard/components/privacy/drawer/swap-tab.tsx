"use client";

import type { PrivacyCashToken } from "@/lib/privacy/constants";
import { cn } from "@/lib/utils";
import { ArrowLeftRight } from "lucide-react";
import { SwapContent } from "./swap-content";

interface SwapTabProps {
  swapFromToken: PrivacyCashToken;
  swapToToken: PrivacyCashToken;
  swapAmount: string;
  swapEstimatedOutput: string;
  privateBalances: Record<PrivacyCashToken, number>;
  isLoadingQuote: boolean;
  isBelowMinimum: boolean;
  minimumAmount: number;
  isConnected: boolean;
  isSwapFormValid: boolean;
  onFromTokenChange: (token: PrivacyCashToken) => void;
  onToTokenChange: (token: PrivacyCashToken) => void;
  onAmountChange: (amount: string) => void;
  onSwapDirection: () => void;
  onSwapSubmit: () => void;
  onClose: () => void;
  recoveryBanner?: React.ReactNode;
}

export function SwapTab({
  swapFromToken,
  swapToToken,
  swapAmount,
  swapEstimatedOutput,
  privateBalances,
  isLoadingQuote,
  isBelowMinimum,
  minimumAmount,
  isConnected,
  isSwapFormValid,
  onFromTokenChange,
  onToTokenChange,
  onAmountChange,
  onSwapDirection,
  onSwapSubmit,
  onClose,
  recoveryBanner,
}: SwapTabProps) {
  return (
    <div className="space-y-4">
      {recoveryBanner}
      <SwapContent
        fromToken={swapFromToken}
        toToken={swapToToken}
        amount={swapAmount}
        estimatedOutput={swapEstimatedOutput}
        privateBalances={privateBalances}
        isLoadingQuote={isLoadingQuote}
        isBelowMinimum={isBelowMinimum}
        minimumAmount={minimumAmount}
        onFromTokenChange={onFromTokenChange}
        onToTokenChange={onToTokenChange}
        onAmountChange={onAmountChange}
        onSwapDirection={onSwapDirection}
      />

      <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={onSwapSubmit}
          disabled={!isConnected || !isSwapFormValid}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            isConnected && isSwapFormValid
              ? "bg-purple-500 text-white hover:bg-purple-500/90 cursor-pointer"
              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed",
          )}
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          Swap
        </button>
      </div>
    </div>
  );
}
