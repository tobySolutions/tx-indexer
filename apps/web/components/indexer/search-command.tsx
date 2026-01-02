"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  ArrowLeftRight,
  ArrowRight,
  User,
  X,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { cn, formatAddress, formatRelativeTime } from "@/lib/utils";
import type {
  SearchResponse,
  SearchResult,
  TransactionSearchResult,
  AccountSearchResult,
} from "@/app/api/search/route";

type TabType = "all" | "transaction" | "account";

function getTransactionIcon(type: string) {
  const className = "h-4 w-4";
  switch (type) {
    case "swap":
      return <ArrowLeftRight className={className} />;
    default:
      return <ArrowRight className={className} />;
  }
}

function formatAmount(amount?: { amountUi: number; symbol: string }) {
  if (!amount) return null;
  return `${amount.amountUi.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${amount.symbol}`;
}

export function SearchCommand() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const debouncedQuery = useDebounce(query, 300);

  const filteredResults =
    activeTab === "all" ? results : results.filter((r) => r.type === activeTab);

  const transactionCount = results.filter(
    (r) => r.type === "transaction"
  ).length;
  const accountCount = results.filter((r) => r.type === "account").length;

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 32) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setIsOpen(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        const data: SearchResponse = await response.json();
        setResults(data.results);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    search();
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    const clickableResults = filteredResults.filter(
      (r) => r.type === "transaction"
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < clickableResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (clickableResults[selectedIndex]) {
          const result = clickableResults[
            selectedIndex
          ] as TransactionSearchResult;
          handleSelectTransaction(result.signature);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  function handleSelectTransaction(signature: string) {
    setIsOpen(false);
    setQuery("");
    router.push(`/indexer/${signature}`);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="search transaction or wallet..."
          className="w-full lowercase pl-12 pr-12 py-4 rounded-2xl border-2 border-neutral-200 
                     focus:border-vibrant-red focus:outline-none transition-colors
                     bg-white"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex items-center gap-2 p-3 border-b border-neutral-100">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors lowercase",
                activeTab === "all"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              all
            </button>
            {transactionCount > 0 && (
              <button
                onClick={() => setActiveTab("transaction")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors lowercase",
                  activeTab === "transaction"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                transaction
              </button>
            )}
            {accountCount > 0 && (
              <button
                onClick={() => setActiveTab("account")}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors lowercase",
                  activeTab === "account"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                account
              </button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              <span className="ml-2 text-sm text-neutral-500 lowercase">
                searching...
              </span>
            </div>
          )}

          {!isLoading && filteredResults.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto">
              {filteredResults.some((r) => r.type === "transaction") && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    transaction
                  </div>
                  {filteredResults
                    .filter((r) => r.type === "transaction")
                    .map((result, index) => {
                      const tx = result as TransactionSearchResult;
                      const isSelected = index === selectedIndex;
                      return (
                        <div
                          key={tx.signature}
                          onClick={() => handleSelectTransaction(tx.signature)}
                          className={cn(
                            "flex justify-between items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                            isSelected ? "bg-neutral-50" : "hover:bg-neutral-50"
                          )}
                        >
                          <div className="flex gap-4 items-center">
                            <div className="p-2 h-fit rounded-lg bg-neutral-100 text-neutral-600">
                              {getTransactionIcon(tx.primaryType)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-neutral-900 truncate">
                                  {formatAddress(tx.signature, 8)}
                                </span>
                              </div>
                              <div className="text-sm text-neutral-500 truncate">
                                {tx.primaryAmount && tx.secondaryAmount ? (
                                  <>
                                    {formatAmount(tx.primaryAmount)} →{" "}
                                    {formatAmount(tx.secondaryAmount)}
                                  </>
                                ) : tx.primaryAmount ? (
                                  formatAmount(tx.primaryAmount)
                                ) : (
                                  tx.primaryType.replace("_", " ")
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {tx.protocol && (
                              <div className="text-sm text-neutral-600">
                                {tx.protocol}
                              </div>
                            )}
                            {tx.blockTime && (
                              <div className="text-xs text-neutral-400">
                                {formatRelativeTime(tx.blockTime)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {filteredResults.some((r) => r.type === "account") && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    account
                  </div>
                  {filteredResults
                    .filter((r) => r.type === "account")
                    .map((result) => {
                      const account = result as AccountSearchResult;
                      return (
                        <div
                          key={account.address}
                          className="flex items-center gap-3 px-4 py-3 cursor-not-allowed opacity-70"
                        >
                          <div className="p-2 rounded-lg bg-neutral-100 text-neutral-600">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="flex justify-between min-w-0 w-full">
                            <div className="flex text-start flex-col">
                              <span className="font-medium text-neutral-900">
                                {formatAddress(account.address, 8)}
                              </span>
                              <span className="text-sm text-neutral-500 truncate font-mono">
                                {account.address}
                              </span>
                            </div>
                            <div className="flex items-end gap-2">
                              <Badge
                                variant="secondary"
                                className="text-xs lowercase"
                              >
                                coming soon
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {!isLoading &&
            results.length === 0 &&
            debouncedQuery.length >= 32 && (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-500 lowercase">
                  no results found
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
