"use client";

import { ExternalLink } from "lucide-react";
import localFont from "next/font/local";

const bitcountFont = localFont({
  src: "../../app/fonts/Bitcount.ttf",
  variable: "--font-bitcount",
});

interface TransactionLinksProps {
  signature: string;
}

export function TransactionLinks({ signature }: TransactionLinksProps) {
  const links = [
    {
      name: "Solana Explorer",
      url: `https://explorer.solana.com/tx/${signature}`,
    },
    {
      name: "Solscan",
      url: `https://solscan.io/tx/${signature}`,
    },
    {
      name: "SolanaFM",
      url: `https://solana.fm/tx/${signature}`,
    },
  ];

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-6">
      <h3 className={`${bitcountFont.className} lowercase text-xl text-neutral-600 mb-4`}>
        <span className="text-vibrant-red">{"//"}</span> VIEW ON
      </h3>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded hover:border-vibrant-red hover:text-vibrant-red transition-colors"
          >
            <span>{link.name}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>
    </div>
  );
}
