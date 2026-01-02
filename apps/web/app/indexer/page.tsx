import localFont from "next/font/local";
import { TransactionsSection } from "@/components/indexer/transactions-section";
import { SearchCommand } from "@/components/indexer/search-command";

const bitcountFont = localFont({
  src: "../fonts/Bitcount.ttf",
  variable: "--font-bitcount",
});

export default async function IndexerPage() {
  return (
    <div className="w-full pb-20">
      <section className="max-w-4xl mx-auto text-center py-16 px-4">
        <h1
          className={`${bitcountFont.className} text-5xl text-neutral-600 mb-4`}
        >
          <span className="text-vibrant-red">{"//"}</span> indexer
        </h1>
        <p className="lowercase text-neutral-500 mb-8">
          explore solana transactions
        </p>

        <SearchCommand />
      </section>

      <TransactionsSection />
    </div>
  );
}
