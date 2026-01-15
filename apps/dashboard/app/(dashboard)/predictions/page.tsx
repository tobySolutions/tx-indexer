import { ComingSoon } from "@/components/coming-soon";
import { Target } from "lucide-react";

export default function PredictionsPage() {
  return (
    <ComingSoon
      title="predictions"
      description="participate in prediction markets. bet on real-world events and earn from your insights."
      icon={Target}
    />
  );
}
