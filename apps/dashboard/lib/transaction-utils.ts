import type { ClassifiedTransaction } from "tx-indexer";

export type TransactionDirection = "incoming" | "outgoing" | "self" | "neutral";

export interface DirectionInfo {
  direction: TransactionDirection;
  prefix: string;
  colorClass: string;
  label: string;
}

export function getTransactionDirection(
  transaction: ClassifiedTransaction,
  walletAddress: string,
): DirectionInfo {
  const { classification } = transaction;
  const sender = classification.sender?.toLowerCase();
  const receiver = classification.receiver?.toLowerCase();
  const wallet = walletAddress.toLowerCase();

  const isSender = sender === wallet;
  const isReceiver = receiver === wallet;

  if (isSender && isReceiver) {
    return {
      direction: "self",
      prefix: "",
      colorClass: "text-neutral-600/90",
      label: getTransactionLabel(classification.primaryType, "self"),
    };
  }

  if (isSender) {
    return {
      direction: "outgoing",
      prefix: "-",
      colorClass: "text-red-600/75",
      label: getTransactionLabel(classification.primaryType, "outgoing"),
    };
  }

  if (isReceiver) {
    return {
      direction: "incoming",
      prefix: "+",
      colorClass: "text-green-600/75",
      label: getTransactionLabel(classification.primaryType, "incoming"),
    };
  }

  return {
    direction: "neutral",
    prefix: "",
    colorClass: "text-neutral-600",
    label:
      classification.primaryType === "swap"
        ? "trade"
        : classification.primaryType.replace("_", " "),
  };
}

function getTransactionLabel(
  type: string,
  direction: TransactionDirection,
): string {
  if (type === "swap") {
    return "trade";
  }

  const formattedType = type.replace("_", " ");

  switch (direction) {
    case "incoming":
      return `received ${formattedType}`;
    case "outgoing":
      return `sent ${formattedType}`;
    case "self":
      return `self ${formattedType}`;
    default:
      return formattedType;
  }
}

export function formatAmountWithDirection(
  amount:
    | {
        token: { symbol: string };
        amountUi: number;
      }
    | null
    | undefined,
  direction: DirectionInfo,
): string {
  if (!amount) return "—";
  const formatted = `${amount.amountUi.toLocaleString()} ${amount.token.symbol}`;
  return direction.prefix ? `${direction.prefix}${formatted}` : formatted;
}

export function formatSwapDetails(
  primaryAmount:
    | { token: { symbol: string }; amountUi: number }
    | null
    | undefined,
  secondaryAmount:
    | { token: { symbol: string }; amountUi: number }
    | null
    | undefined,
): string | null {
  if (!primaryAmount || !secondaryAmount) return null;
  return `${primaryAmount.amountUi.toLocaleString()} ${primaryAmount.token.symbol} → ${secondaryAmount.amountUi.toLocaleString()} ${secondaryAmount.token.symbol}`;
}
