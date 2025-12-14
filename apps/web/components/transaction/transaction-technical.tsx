"use client";

import type { ClassifiedTransaction, TxLeg } from "tx-indexer";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import localFont from "next/font/local";
import { CopyButton } from "@/components/copy-button";
import { formatDate } from "@/lib/utils";

const bitcountFont = localFont({
  src: "../../app/fonts/Bitcount.ttf",
  variable: "--font-bitcount",
});

interface TransactionTechnicalProps {
  transaction: ClassifiedTransaction;
}

export function TransactionTechnical({
  transaction,
}: TransactionTechnicalProps) {
  const [legsOpen, setLegsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { tx, legs } = transaction;

  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => setLegsOpen(!legsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
        >
          <h3 className={`${bitcountFont.className} lowercase text-xl text-neutral-600`}>
            <span className="text-vibrant-red">{"//"}</span> TRANSACTION
            BREAKDOWN ({legs.length} Legs)
          </h3>
          {legsOpen ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </button>

        {legsOpen && (
          <div className="px-6 pb-6 space-y-3">
            <p className="text-sm text-neutral-500 mb-4 lowercase">
              This shows every token movement in this transaction
            </p>
            {legs.map((leg: TxLeg, index: number) => (
              <div
                key={index}
                className="border border-neutral-200 rounded-lg bg-neutral-50 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-neutral-500">
                    Leg {index + 1}
                  </span>
                  <span className="text-xs text-neutral-400 capitalize">
                    {leg.side} · {leg.role}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600">Account:</span>
                    <span className="font-mono text-sm text-neutral-900">
                      {leg.accountId.length > 20
                        ? `${leg.accountId.slice(0, 20)}...${leg.accountId.slice(-8)}`
                        : leg.accountId}
                    </span>
                    <CopyButton text={leg.accountId} />
                  </div>

                  <div className="pt-2 border-t border-neutral-200">
                    <div className="text-lg font-semibold text-neutral-900">
                      {leg.amount.amountUi.toLocaleString()}{" "}
                      {leg.amount.token.symbol}
                    </div>
                    {leg.amount.token.mint && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-neutral-400">
                          {leg.amount.token.mint.slice(0, 8)}...
                        </span>
                        <CopyButton text={leg.amount.token.mint} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
        >
          <h3 className={`${bitcountFont.className} text-xl text-neutral-600 lowercase`}>
            <span className="text-vibrant-red">{"//"}</span> TECHNICAL DETAILS
          </h3>
          {detailsOpen ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </button>

        {detailsOpen && (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">Slot</div>
                <div className="font-mono text-sm text-neutral-900">
                  {tx.slot.toString()}
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 mb-1">Block Time</div>
                <div className="text-sm text-neutral-900">
                  {formatDate(tx.blockTime)}
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 mb-1">Programs</div>
                <div className="text-sm text-neutral-900">
                  {tx.programIds.length} program(s)
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 mb-2">Signature</div>
              <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded font-mono text-sm break-all">
                <span className="text-neutral-900">{tx.signature}</span>
                <CopyButton text={tx.signature} />
              </div>
            </div>

            {tx.programIds.length > 0 && (
              <div>
                <div className="text-xs text-neutral-500 mb-2">Program IDs</div>
                <div className="space-y-2">
                  {tx.programIds.map((programId, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-neutral-50 rounded font-mono text-sm break-all"
                    >
                      <span className="text-neutral-900">{programId}</span>
                      <CopyButton text={programId} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tx.memo && (
              <div>
                <div className="text-xs text-neutral-500 mb-2">Memo</div>
                <div className="p-3 bg-neutral-50 rounded text-sm text-neutral-900">
                  {tx.memo}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
