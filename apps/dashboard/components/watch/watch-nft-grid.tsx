"use client";

import { useState } from "react";
import Image from "next/image";
import type { NftAsset } from "@/app/actions/nfts";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchNftGridProps {
  nfts: NftAsset[];
  total: number;
}

export function WatchNftGrid({ nfts, total }: WatchNftGridProps) {
  // Filter out spam NFTs for display
  const validNfts = nfts.filter((nft) => !nft.isSpam);

  if (validNfts.length === 0) {
    return null;
  }

  const displayNfts = validNfts.slice(0, 3);
  const hasMore = total > 3;

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            collectibles
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {total} total
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {displayNfts.map((nft) => (
            <NftCard key={nft.mint} nft={nft} />
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            +{total - 3} more
          </span>
        </div>
      )}
    </div>
  );
}

function NftCard({ nft }: { nft: NftAsset }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = nft.cdnImage || nft.image;

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
      {imageUrl && !imageError ? (
        <Image
          src={imageUrl}
          alt={nft.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 33vw, 16vw"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="w-6 h-6 text-neutral-400 dark:text-neutral-600" />
        </div>
      )}

      {/* Hover overlay with name */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "flex items-end p-2",
        )}
      >
        <span className="text-[10px] text-white font-medium truncate w-full">
          {nft.name}
        </span>
      </div>
    </div>
  );
}
