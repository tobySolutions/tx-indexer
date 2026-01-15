import { ComingSoon } from "@/components/coming-soon";
import { TrendingUp } from "lucide-react";

export default function StocksPage() {
  return (
    <ComingSoon
      title="stocks"
      description="buy and sell tokenized stocks directly from your wallet. trade traditional markets on solana."
      icon={TrendingUp}
    />
  );
}
