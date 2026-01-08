import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Sparkles,
  Circle,
} from "lucide-react";

/**
 * Returns the appropriate icon component for a transaction based on type and direction
 */
export function getTransactionIcon(type: string, direction: string) {
  const className = "h-4 w-4";

  if (direction === "incoming") {
    return <ArrowDownLeft className={className} />;
  }
  if (direction === "outgoing") {
    return <ArrowUpRight className={className} />;
  }

  switch (type) {
    case "swap":
      return <ArrowLeftRight className={className} />;
    case "transfer":
      return <ArrowRight className={className} />;
    case "airdrop":
      return <Gift className={className} />;
    case "nft_mint":
      return <Sparkles className={className} />;
    default:
      return <Circle className={className} />;
  }
}

/**
 * Returns the background/text color classes for a transaction icon based on direction
 */
export function getTransactionIconBgClass(direction: string): string {
  switch (direction) {
    case "incoming":
      return "bg-green-50 text-green-600";
    case "outgoing":
      return "bg-red-50 text-red-600";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}
