import localFont from "next/font/local";
import { Construction, type LucideIcon } from "lucide-react";

const bitcountFont = localFont({
  src: "../app/fonts/Bitcount.ttf",
  variable: "--font-bitcount",
});

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
}: ComingSoonProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-neutral-100 mx-auto mb-6 flex items-center justify-center">
          <Icon className="w-8 h-8 text-neutral-400" />
        </div>
        <h1
          className={`${bitcountFont.className} text-3xl text-neutral-900 mb-3`}
        >
          <span className="text-vibrant-red">{"//"}</span> {title}
        </h1>
        <p className="text-neutral-600 mb-6 lowercase">{description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-full">
          <div className="w-2 h-2 bg-vibrant-red rounded-full animate-pulse" />
          <span className="text-sm text-neutral-600 lowercase">
            coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
