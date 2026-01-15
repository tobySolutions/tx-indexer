import { ComingSoon } from "@/components/coming-soon";
import { Coins } from "lucide-react";

export default function EarnPage() {
  return (
    <ComingSoon
      title="earn"
      description="stake your assets and earn yield. explore staking, lending, and liquidity provision opportunities."
      icon={Coins}
    />
  );
}
