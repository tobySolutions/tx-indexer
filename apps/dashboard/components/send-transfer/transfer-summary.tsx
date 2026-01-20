import { Loader2 } from "lucide-react";
import type { FeeEstimate } from "@/app/actions/estimate-fee";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface TransferSummaryProps {
  amountUsd: number;
  feeEstimate: FeeEstimate | null;
  isFeeLoading: boolean;
}

export function TransferSummary({
  amountUsd,
  feeEstimate,
  isFeeLoading,
}: TransferSummaryProps) {
  const feeUsd = feeEstimate?.feeUsd ?? 0;
  const totalUsd = amountUsd + feeUsd;

  return (
    <div className="mt-6 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
        summary
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">amount</span>
          <span className="font-mono text-neutral-900 dark:text-neutral-100">
            {formatUsd(amountUsd)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            fee
            {feeEstimate?.needsAccountCreation && (
              <span className="text-neutral-400 dark:text-neutral-500 text-xs ml-1">
                (includes account setup)
              </span>
            )}
          </span>
          <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            {isFeeLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : feeUsd < 0.01 ? (
              "less than $0.01"
            ) : (
              <span className="font-mono">{formatUsd(feeUsd)}</span>
            )}
          </span>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-neutral-900 dark:text-neutral-100">
              total
            </span>
            <span className="font-mono text-neutral-900 dark:text-neutral-100">
              {formatUsd(totalUsd)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
