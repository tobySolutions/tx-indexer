import { describe, test, expect } from "bun:test";
import { NftTransferClassifier } from "../../classifiers/nft-transfer-classifier";
import {
  createMockTransaction,
  createMockLeg,
  createSolAmount,
  createNftAmount,
} from "../fixtures/mock-factories";

describe("NftTransferClassifier", () => {
  const classifier = new NftTransferClassifier();

  describe("NFT Receive (simple transfer)", () => {
    test("should classify receiving an NFT", () => {
      const receiver = "RECEIVER123";
      const sender = "SENDER456";
      const nftMint = "NFT_COOL_APE_MINT";
      const legs = [
        createMockLeg({
          accountId: `external:${sender}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Cool Ape #123", nftMint),
        }),
        createMockLeg({
          accountId: `external:${receiver}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Cool Ape #123", nftMint),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx, walletAddress: receiver });

      expect(result).not.toBeNull();
      expect(result?.primaryType).toBe("nft_receive");
      expect(result?.receiver).toBe(receiver);
      expect(result?.sender).toBe(sender);
      expect(result?.metadata?.nft_name).toBe("Cool Ape #123");
      expect(result?.confidence).toBe(0.85);
    });

    test("should classify receiving multiple NFTs", () => {
      const receiver = "RECEIVER123";
      const legs = [
        createMockLeg({
          accountId: `external:${receiver}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("NFT #1"),
        }),
        createMockLeg({
          accountId: `external:${receiver}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("NFT #2"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result?.primaryType).toBe("nft_receive");
      expect(result?.metadata?.quantity).toBe(2);
    });

    test("should classify receiving NFT without known sender", () => {
      const receiver = "RECEIVER123";
      const legs = [
        createMockLeg({
          accountId: `external:${receiver}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Mystery NFT"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result?.primaryType).toBe("nft_receive");
      expect(result?.sender).toBeNull();
      expect(result?.counterparty).toBeNull();
    });
  });

  describe("NFT Send (simple transfer)", () => {
    test("should classify sending an NFT", () => {
      const sender = "SENDER123";
      const receiver = "RECEIVER456";
      const nftMint = "NFT_COOL_APE_MINT";
      const legs = [
        createMockLeg({
          accountId: `external:${sender}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Cool Ape #123", nftMint),
        }),
        createMockLeg({
          accountId: `external:${receiver}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Cool Ape #123", nftMint),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx, walletAddress: sender });

      expect(result?.primaryType).toBe("nft_send");
      expect(result?.sender).toBe(sender);
      expect(result?.receiver).toBe(receiver);
      expect(result?.metadata?.nft_name).toBe("Cool Ape #123");
    });

    test("should classify sending NFT without known receiver", () => {
      const sender = "SENDER123";
      const legs = [
        createMockLeg({
          accountId: `external:${sender}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("My NFT"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result?.primaryType).toBe("nft_send");
      expect(result?.sender).toBe(sender);
      expect(result?.receiver).toBeNull();
    });

    test("should classify sending multiple NFTs", () => {
      const sender = "SENDER123";
      const legs = [
        createMockLeg({
          accountId: `external:${sender}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("NFT #1"),
        }),
        createMockLeg({
          accountId: `external:${sender}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("NFT #2"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result?.primaryType).toBe("nft_send");
      expect(result?.metadata?.quantity).toBe(2);
    });
  });

  describe("NFT Purchase (marketplace)", () => {
    test("should classify Magic Eden purchase", () => {
      const buyer = "BUYER123";
      const legs = [
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "debit",
          role: "sent",
          amount: createSolAmount(5.5),
        }),
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Mad Lad #1234"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "magic-eden", name: "Magic Eden" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: buyer });

      expect(result?.primaryType).toBe("nft_purchase");
      expect(result?.receiver).toBe(buyer);
      expect(result?.metadata?.purchase_price).toBe(5.5);
      expect(result?.metadata?.purchase_token).toBe("SOL");
      expect(result?.metadata?.marketplace).toBe("magic-eden");
      expect(result?.confidence).toBe(0.9);
    });

    test("should classify Tensor purchase", () => {
      const buyer = "BUYER123";
      const legs = [
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "debit",
          role: "sent",
          amount: createSolAmount(10.0),
        }),
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Degen Ape #5678"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "tensor", name: "Tensor" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: buyer });

      expect(result?.primaryType).toBe("nft_purchase");
      expect(result?.metadata?.marketplace).toBe("tensor");
    });

    test("should classify Tensor Marketplace purchase", () => {
      const buyer = "BUYER123";
      const legs = [
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "debit",
          role: "sent",
          amount: createSolAmount(8.0),
        }),
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("SMB #999"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "tensor-marketplace", name: "Tensor Marketplace" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: buyer });

      expect(result?.primaryType).toBe("nft_purchase");
      expect(result?.metadata?.marketplace).toBe("tensor-marketplace");
    });

    test("should classify Hadeswap purchase", () => {
      const buyer = "BUYER123";
      const legs = [
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "debit",
          role: "sent",
          amount: createSolAmount(3.0),
        }),
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("y00t #1234"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "hadeswap", name: "Hadeswap" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: buyer });

      expect(result?.primaryType).toBe("nft_purchase");
      expect(result?.metadata?.marketplace).toBe("hadeswap");
    });

    test("should classify Auction House purchase", () => {
      const buyer = "BUYER123";
      const legs = [
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "debit",
          role: "sent",
          amount: createSolAmount(15.0),
        }),
        createMockLeg({
          accountId: `external:${buyer}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Art Piece #1"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "auction-house", name: "Metaplex Auction House" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: buyer });

      expect(result?.primaryType).toBe("nft_purchase");
      expect(result?.metadata?.marketplace).toBe("auction-house");
    });
  });

  describe("NFT Sale (marketplace)", () => {
    test("should classify Magic Eden sale", () => {
      const seller = "SELLER123";
      const legs = [
        createMockLeg({
          accountId: `external:${seller}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Cool NFT"),
        }),
        createMockLeg({
          accountId: `external:${seller}`,
          side: "credit",
          role: "received",
          amount: createSolAmount(8.0),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "magic-eden", name: "Magic Eden" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: seller });

      expect(result?.primaryType).toBe("nft_sale");
      expect(result?.sender).toBe(seller);
      expect(result?.metadata?.sale_price).toBe(8.0);
      expect(result?.metadata?.sale_token).toBe("SOL");
      expect(result?.metadata?.marketplace).toBe("magic-eden");
    });

    test("should classify Tensor sale", () => {
      const seller = "SELLER123";
      const legs = [
        createMockLeg({
          accountId: `external:${seller}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Fox #1234"),
        }),
        createMockLeg({
          accountId: `external:${seller}`,
          side: "credit",
          role: "received",
          amount: createSolAmount(15.0),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "tensor", name: "Tensor" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: seller });

      expect(result?.primaryType).toBe("nft_sale");
      expect(result?.metadata?.marketplace).toBe("tensor");
    });

    test("should classify Hadeswap sale", () => {
      const seller = "SELLER123";
      const legs = [
        createMockLeg({
          accountId: `external:${seller}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Okay Bear #5678"),
        }),
        createMockLeg({
          accountId: `external:${seller}`,
          side: "credit",
          role: "received",
          amount: createSolAmount(25.0),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "hadeswap", name: "Hadeswap" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: seller });

      expect(result?.primaryType).toBe("nft_sale");
      expect(result?.metadata?.marketplace).toBe("hadeswap");
    });

    test("should classify sale without proceeds", () => {
      const seller = "SELLER123";
      const legs = [
        createMockLeg({
          accountId: `external:${seller}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Listed NFT"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "magic-eden", name: "Magic Eden" },
      });

      const result = classifier.classify({ legs, tx, walletAddress: seller });

      expect(result?.primaryType).toBe("nft_sale");
      expect(result?.metadata?.sale_price).toBeUndefined();
    });
  });

  describe("Compressed NFTs (cNFTs)", () => {
    test("should classify cNFT receive", () => {
      const receiver = "RECEIVER123";
      const legs = [
        createMockLeg({
          accountId: `external:${receiver}`,
          side: "credit",
          role: "received",
          amount: createNftAmount("Compressed NFT #1"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result?.primaryType).toBe("nft_receive");
    });

    test("should classify cNFT send", () => {
      const sender = "SENDER123";
      const legs = [
        createMockLeg({
          accountId: `external:${sender}`,
          side: "debit",
          role: "sent",
          amount: createNftAmount("Compressed NFT #2"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result?.primaryType).toBe("nft_send");
    });
  });

  describe("Should NOT classify as NFT transfer", () => {
    test("should return null for NFT mint protocol", () => {
      const legs = [
        createMockLeg({
          accountId: "external:USER123",
          side: "credit",
          role: "received",
          amount: createNftAmount("Minted NFT"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "candy-machine-v3", name: "Candy Machine V3" },
      });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });

    test("should return null for Metaplex mint protocol", () => {
      const legs = [
        createMockLeg({
          accountId: "external:USER123",
          side: "credit",
          role: "received",
          amount: createNftAmount("Minted NFT"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "metaplex", name: "Metaplex" },
      });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });

    test("should return null for Bubblegum mint protocol", () => {
      const legs = [
        createMockLeg({
          accountId: "external:USER123",
          side: "credit",
          role: "received",
          amount: createNftAmount("Compressed Mint"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "bubblegum", name: "Bubblegum" },
      });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });

    test("should return null for DEX swap", () => {
      const legs = [
        createMockLeg({
          accountId: "external:USER123",
          side: "credit",
          role: "received",
          amount: createNftAmount("Some Token"),
        }),
      ];
      const tx = createMockTransaction({
        protocol: { id: "jupiter", name: "Jupiter" },
      });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });

    test("should return null when no NFT legs", () => {
      const legs = [
        createMockLeg({
          accountId: "external:USER123",
          side: "debit",
          role: "sent",
          amount: createSolAmount(1.0),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });

    test("should return null for fungible token transfer", () => {
      const legs = [
        createMockLeg({
          accountId: "external:USER123",
          side: "credit",
          role: "received",
          amount: {
            token: {
              mint: "USDC_MINT",
              symbol: "USDC",
              name: "USDC",
              decimals: 6,
            },
            amountRaw: "1000000",
            amountUi: 1.0,
          },
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });

    test("should return null for internal protocol legs", () => {
      const legs = [
        createMockLeg({
          accountId: "protocol:SOME_PROGRAM",
          side: "credit",
          role: "received",
          amount: createNftAmount("Internal NFT"),
        }),
      ];
      const tx = createMockTransaction({ protocol: null });

      const result = classifier.classify({ legs, tx });

      expect(result).toBeNull();
    });
  });
});
