import type { Metadata } from "next";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "itx-indexer | The Solana Transaction Indexer",
  description:
    "Transforms raw blockchain data into human-readable transactions. Swaps, transfers, NFT mints, all classified automatically. Open source SDK for developers.",
  openGraph: {
    title: "itx-indexer | The Solana Transaction Indexer",
    description:
      "Transforms raw blockchain data into human-readable transactions. Swaps, transfers, NFT mints, all classified automatically.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "itx-indexer | The Solana Transaction Indexer",
    description:
      "Transforms raw blockchain data into human-readable transactions. Open source SDK for developers.",
  },
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header showMobileNav={false} />
      <main>{children}</main>
    </>
  );
}
