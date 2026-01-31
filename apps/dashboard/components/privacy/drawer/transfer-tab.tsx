"use client";

import type { WalletLabel } from "@/app/actions/wallet-labels";
import type { useDashboardData } from "@/hooks/use-dashboard-data";
import type { PrivacyCashToken } from "@/lib/privacy/constants";
import { cn } from "@/lib/utils";
import {
  ModeTabs,
  AssetSelector,
  BalanceDisplay,
  AmountInput,
  RecipientSelector,
  InfoBox,
  AnimatedNotice,
  type OperationMode,
} from "./index";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

interface TransferTabProps {
  mode: OperationMode;
  selectedToken: PrivacyCashToken;
  walletBalance: number;
  privateBalance: number;
  dashboardBalance: ReturnType<typeof useDashboardData>["balance"];
  privateBalances: Record<PrivacyCashToken, number>;
  isLoadingPrivateBalances: boolean;
  isLoadingBalance: boolean;
  amount: string;
  insufficientBalance: boolean;
  recipientAddress: string;
  walletAddress: string | null;
  labelsList: WalletLabel[];
  isTopUpFlow: boolean;
  isConnected: boolean;
  isProcessing: boolean;
  isTransferFormValid: boolean;
  onModeChange: (mode: OperationMode) => void;
  onTokenSelect: (token: PrivacyCashToken) => void;
  onAmountChange: (value: string) => void;
  onSetMax: () => void;
  onRecipientChange: (address: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function TransferTab({
  mode,
  selectedToken,
  walletBalance,
  privateBalance,
  dashboardBalance,
  privateBalances,
  isLoadingPrivateBalances,
  isLoadingBalance,
  amount,
  insufficientBalance,
  recipientAddress,
  walletAddress,
  labelsList,
  isTopUpFlow,
  isConnected,
  isProcessing,
  isTransferFormValid,
  onModeChange,
  onTokenSelect,
  onAmountChange,
  onSetMax,
  onRecipientChange,
  onClose,
  onSubmit,
}: TransferTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ModeTabs mode={mode} onModeChange={onModeChange} />

      <AssetSelector
        selectedToken={selectedToken}
        walletBalance={walletBalance}
        privateBalance={privateBalance}
        mode={mode}
        dashboardBalance={dashboardBalance}
        privateBalances={privateBalances}
        isLoadingPrivateBalances={isLoadingPrivateBalances}
        onTokenSelect={onTokenSelect}
      />

      <BalanceDisplay
        walletBalance={walletBalance}
        privateBalance={privateBalance}
        selectedToken={selectedToken}
        isLoadingBalance={isLoadingBalance}
      />

      <AmountInput
        amount={amount}
        selectedToken={selectedToken}
        insufficientBalance={insufficientBalance}
        mode={mode}
        onAmountChange={onAmountChange}
        onSetMax={onSetMax}
      />

      {mode === "withdraw" && (
        <RecipientSelector
          recipientAddress={recipientAddress}
          walletAddress={walletAddress}
          labelsList={labelsList}
          onRecipientChange={onRecipientChange}
        />
      )}

      <AnimatedNotice
        show={isTopUpFlow && mode === "withdraw" && selectedToken === "SOL"}
      >
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3 text-xs text-purple-700 dark:text-purple-300">
          Suggested amount: 0.01 SOL to cover processing costs.
        </div>
      </AnimatedNotice>

      <InfoBox mode={mode} />

      <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          cancel
        </button>
        <button
          type="submit"
          disabled={!isConnected || isProcessing || !isTransferFormValid}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
            isConnected && !isProcessing && isTransferFormValid
              ? "bg-purple-500 text-white hover:bg-purple-500/90 cursor-pointer"
              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed",
          )}
        >
          {mode === "deposit" ? (
            <>
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
              Deposit
            </>
          ) : (
            <>
              <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
              Withdraw
            </>
          )}
        </button>
      </div>
    </form>
  );
}
