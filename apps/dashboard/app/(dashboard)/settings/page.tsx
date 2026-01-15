import { ComingSoon } from "@/components/coming-soon";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="settings"
      description="customize your dashboard experience. manage wallet labels, notifications, and preferences."
      icon={Settings}
    />
  );
}
