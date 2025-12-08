import { z } from "zod";

const ClusterSchema = z.union([
  z.literal("mainnet-beta"),
  z.literal("testnet"),
  z.literal("devnet"),
  z.string(),
]);

export type Cluster = z.infer<typeof ClusterSchema>;
