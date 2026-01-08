import { type PortfolioSummary } from "@/app/actions/dashboard";
import { truncate } from "@/lib/utils";
import { CopyButton } from "@/components/copy-button";
import { PortfolioActions } from "@/components/portfolio-actions";
import { Wallet } from "lucide-react";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface PortfolioCardProps {
  portfolio: PortfolioSummary | null;
  walletAddress: string | null;
  onSend?: () => void;
  onTrade?: () => void;
}

export function PortfolioCard({
  portfolio,
  walletAddress,
  onSend,
  onTrade,
}: PortfolioCardProps) {
  const total = portfolio?.totalUsd ?? 0;
  const stablecoins = portfolio?.stablecoinsUsd ?? 0;
  const variable = portfolio?.variableAssetsUsd ?? 0;
  const unpriced = portfolio?.unpricedCount ?? 0;

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neutral-100">
            <Wallet className="h-5 w-5 text-neutral-600" />
          </div>
          <span className="text-neutral-500">portfolio</span>
          {walletAddress && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-neutral-400 font-mono">
                {truncate(walletAddress)}
              </span>
              <CopyButton value={walletAddress} />
            </div>
          )}
        </div>
        <PortfolioActions
          walletAddress={walletAddress}
          onSend={onSend}
          onTrade={onTrade}
        />
      </div>
      <p className="text-3xl font-mono text-neutral-900 mb-2">
        {formatUsd(total)}
      </p>
      <p className="text-sm text-neutral-500">
        stablecoins {formatUsd(stablecoins)} · variable assets{" "}
        {formatUsd(variable)}
        {unpriced > 0 && (
          <span className="text-neutral-400"> · +{unpriced} unpriced</span>
        )}
      </p>
    </div>
  );
}
