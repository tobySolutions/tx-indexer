import {
  createSolanaRpc,
  signature,
  type Address,
  type Signature,
} from "@solana/kit";

const rpc = createSolanaRpc(process.env.RPC_URL!);

export async function getSolBalance(address: Address) {
  const balance = await rpc.getBalance(address).send();
  return balance;
}

export async function getRawTransaction(signature: Signature) {
  const transactions = await rpc
    .getTransaction(signature, { commitment: "confirmed", encoding: "json" })
    .send();
  return transactions;
}

console.log(
  await getRawTransaction(
    signature(
      "4NLPFMPEYbz8SmThrgvwr2A7dDE6woeuTwX5TstMMEYTsJkGY45sYkAkzPWbfSco7ZZFrkpqNMF6BbSPo7fJsyY4"
    )
  )
);
