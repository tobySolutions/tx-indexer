"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  iconClassName?: string;
}

export function CopyButton({ text, className, iconClassName }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1 hover:bg-neutral-100 rounded transition-colors",
        className
      )}
      title="Copy"
    >
      {copied ? (
        <Check className={cn("h-4 w-4 text-green-600", iconClassName)} />
      ) : (
        <Copy className={cn("h-4 w-4 text-neutral-400", iconClassName)} />
      )}
    </button>
  );
}
