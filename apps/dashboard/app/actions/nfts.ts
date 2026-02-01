"use server";

export interface NftAsset {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  cdnImage?: string;
  collection?: {
    name: string;
    address: string;
    verified: boolean;
  };
  isCompressed: boolean;
  isSpam: boolean;
}

interface DasAssetsByOwnerResponse {
  jsonrpc: string;
  result?: {
    total: number;
    limit: number;
    page: number;
    items: Array<{
      id: string;
      interface: string;
      content: {
        metadata: {
          name: string;
          symbol: string;
        };
        links?: {
          image?: string;
        };
        files?: Array<{
          uri: string;
          cdn_uri?: string;
          mime: string;
        }>;
      };
      grouping?: Array<{
        group_key: string;
        group_value: string;
        verified?: boolean;
        collection_metadata?: {
          name?: string;
        };
      }>;
      compression?: {
        compressed: boolean;
      };
      burnt?: boolean;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

const RPC_URL = process.env.SERVER_RPC_URL;

/**
 * Fetch NFTs owned by a wallet using Helius DAS API
 */
export async function getNftsForWallet(
  walletAddress: string,
  limit: number = 50,
): Promise<{ nfts: NftAsset[]; total: number }> {
  if (!RPC_URL) {
    console.warn("[NFT] No RPC URL configured");
    return { nfts: [], total: 0 };
  }

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-assets-by-owner",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit,
          displayOptions: {
            showCollectionMetadata: true,
            showUnverifiedCollections: false,
          },
        },
      }),
    });

    const data = (await response.json()) as DasAssetsByOwnerResponse;

    if (data.error || !data.result?.items) {
      console.warn("[NFT] DAS API error:", data.error?.message);
      return { nfts: [], total: 0 };
    }

    // Filter to only NFTs (not fungible tokens), exclude burnt
    const nftItems = data.result.items.filter(
      (item) =>
        !item.burnt &&
        (item.interface === "V1_NFT" ||
          item.interface === "ProgrammableNFT" ||
          item.interface === "V2_NFT" ||
          item.interface === "Custom"),
    );

    const nfts: NftAsset[] = nftItems.map((item) => {
      const collectionGroup = item.grouping?.find(
        (g) => g.group_key === "collection",
      );
      const isCompressed = item.compression?.compressed ?? false;
      const hasVerifiedCollection = collectionGroup?.verified ?? false;
      const hasImage = !!(
        item.content.links?.image || item.content.files?.[0]?.uri
      );

      // Spam detection heuristics
      const nameLower = (item.content.metadata.name || "").toLowerCase();
      const collectionName = (
        collectionGroup?.collection_metadata?.name || ""
      ).toLowerCase();

      const spamKeywords = [
        "free",
        "claim",
        "airdrop",
        "reward",
        "voucher",
        ".com",
        ".net",
        ".io",
        ".xyz",
        ".org",
        "scan",
        "qr code",
        "coupon",
        "$gift",
      ];

      const isSpam =
        !hasImage ||
        spamKeywords.some((kw) => nameLower.includes(kw)) ||
        spamKeywords.some((kw) => collectionName.includes(kw)) ||
        nameLower.startsWith("✅") ||
        nameLower.startsWith("$") ||
        (isCompressed && !hasVerifiedCollection); // Compressed without verified = likely spam airdrop

      return {
        mint: item.id,
        name: item.content.metadata.name || "Unknown",
        symbol: item.content.metadata.symbol || "",
        image: item.content.links?.image || item.content.files?.[0]?.uri || "",
        cdnImage: item.content.files?.[0]?.cdn_uri,
        collection: collectionGroup
          ? {
              name:
                collectionGroup.collection_metadata?.name ||
                "Unknown Collection",
              address: collectionGroup.group_value,
              verified: hasVerifiedCollection,
            }
          : undefined,
        isCompressed,
        isSpam,
      };
    });

    // Sort: verified collections first, then non-spam, then spam
    nfts.sort((a, b) => {
      const aScore = (a.collection?.verified ? 0 : 1) + (a.isSpam ? 2 : 0);
      const bScore = (b.collection?.verified ? 0 : 1) + (b.isSpam ? 2 : 0);
      return aScore - bScore;
    });

    // Count non-spam NFTs for the total
    const nonSpamCount = nfts.filter((n) => !n.isSpam).length;

    return {
      nfts,
      total: nonSpamCount,
    };
  } catch (error) {
    console.error("[NFT] Failed to fetch NFTs:", error);
    return { nfts: [], total: 0 };
  }
}
