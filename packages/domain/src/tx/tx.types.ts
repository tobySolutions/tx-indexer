import { ProtocolInfoSchema } from "@domain/actors/counterparty.types";
import { z } from "zod";
import type { Signature } from "@solana/kit";

const TxDirectionSchema = z.enum(["incoming", "outgoing", "self", "neutral"]);

const TxPrimaryTypeSchema = z.enum([
  "transfer",
  "swap",
  "nft_purchase",
  "nft_sale",
  "nft_mint",
  "stake_deposit",
  "stake_withdraw",
  "token_deposit",
  "token_withdraw",
  "airdrop",
  "bridge_in",
  "bridge_out",
  "reward",
  "fee_only",
  "other",
]);

export const TxCategorySchema = z.enum([
  "income",
  "expense",
  "transfer",
  "investment",
  "savings",
  "fee",
  "refund",
  "tax",
  "other",
]);

export const RawTransactionSchema = z.object({
  signature: z.custom<Signature>((val) => typeof val === "string"),
  slot: z.union([z.number(), z.bigint()]),
  blockTime: z.union([z.number(), z.bigint()]).nullable(),
  err: z.any().nullable(),
  programIds: z.array(z.string()),
  protocol: ProtocolInfoSchema.nullable(),
});

export type TxDirection = z.infer<typeof TxDirectionSchema>;
export type TxPrimaryType = z.infer<typeof TxPrimaryTypeSchema>;
export type TxCategory = z.infer<typeof TxCategorySchema>;
export type RawTransaction = z.infer<typeof RawTransactionSchema>;
