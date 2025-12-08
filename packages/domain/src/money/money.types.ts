import { z } from "zod";

const SupportedCurrencySchema = z.enum(["USD", "EUR"]);

const TokenInfoSchema = z.object({
  mint: z.string(),
  symbol: z.string(),
  name: z.string().optional(),
  decimals: z.number().int().nonnegative(),
  logoURI: z.url().optional(),
});

const FiatValueSchema = z.object({
  currency: SupportedCurrencySchema,
  amount: z.number(),
  pricePerUnit: z.number(),
  source: z.string().optional(),
  at: z.date(),
});

const MoneyAmountSchema = z.object({
  token: TokenInfoSchema,
  amountRaw: z.string().regex(/^\d+$/),
  amountUi: z.number(),
  fiat: FiatValueSchema.optional(),
});

export type TokenInfo = z.infer<typeof TokenInfoSchema>;
export type FiatValue = z.infer<typeof FiatValueSchema>;
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;
