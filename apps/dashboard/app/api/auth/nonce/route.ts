import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * Generates a random nonce for SIWS (Sign In With Solana)
 * The nonce is used to create a unique message for the user to sign
 */
export async function GET() {
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  return NextResponse.json({
    nonce,
    expiresAt,
  });
}
