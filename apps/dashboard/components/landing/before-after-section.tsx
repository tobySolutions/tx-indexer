import localFont from "next/font/local";
import { ArrowRight } from "lucide-react";

const bitcountFont = localFont({
  src: "../../app/fonts/Bitcount.ttf",
  variable: "--font-bitcount",
});

export function BeforeAfterSection() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <h2
        className={`${bitcountFont.className} text-3xl text-neutral-600 text-center mb-12`}
      >
        <span className="text-vibrant-red">{"//"}</span> before & after
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Before */}
        <div className="border border-neutral-200 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-sm font-medium text-neutral-600 lowercase">
              before: raw transaction data
            </span>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4 font-mono text-xs space-y-2 text-neutral-500 overflow-x-auto">
            <p className="text-neutral-400">// what you see on explorers</p>
            <p>signature: 4cu2aBE...TBxsF</p>
            <p>program: JUP6LkbZ...2jnCN</p>
            <p>accounts: [0x7f3d...12 more]</p>
            <p>innerInstructions: [...]</p>
            <p>preBalances: [1840293, 0, ...]</p>
            <p>postBalances: [1423847, 416446, ...]</p>
          </div>
        </div>

        {/* After */}
        <div className="border border-vibrant-red/30 rounded-lg p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-neutral-600 lowercase">
              after: classified transaction
            </span>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-1 bg-vibrant-red/10 text-vibrant-red text-xs font-medium rounded lowercase">
                swap
              </span>
              <span className="text-xs text-neutral-400">via Jupiter</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-neutral-900">100 USDC</span>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
              <span className="font-semibold text-neutral-900">2.5 SOL</span>
            </div>
            <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-200">
              <p>Dec 15, 2025 at 3:30 PM</p>
              <p className="font-mono mt-1">Fee: $0.0012</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
