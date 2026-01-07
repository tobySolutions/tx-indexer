import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import nacl from "tweetnacl";
import bs58 from "bs58";

interface VerifyRequest {
  walletAddress: string;
  signature: string;
  message: string;
  nonce: string;
}

/**
 * Verifies the signed message and creates/retrieves a Supabase session
 */
export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { walletAddress, signature, message, nonce } = body;

    // Validate required fields
    if (!walletAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the message contains the nonce (basic validation)
    if (!message.includes(nonce)) {
      return NextResponse.json(
        { error: "Invalid message: nonce mismatch" },
        { status: 400 },
      );
    }

    // Verify the signature
    const isValid = verifySignature(walletAddress, signature, message);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Create or get user in Supabase
    const supabase = createAdminClient();

    // Use wallet address as the unique identifier
    const email = `${walletAddress}@solana.wallet`;

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) =>
        u.email === email || u.user_metadata?.wallet_address === walletAddress,
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            wallet_address: walletAddress,
          },
        });

      if (createError || !newUser.user) {
        console.error("[Auth] Failed to create user:", createError);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 },
        );
      }

      userId = newUser.user.id;
    }

    // Generate a session for the user
    const { data: sessionData, error: sessionError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (sessionError || !sessionData) {
      console.error("[Auth] Failed to generate session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    // Extract the token from the action link
    const url = new URL(sessionData.properties.action_link);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Failed to generate token" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      token,
      tokenType: "magiclink",
    });
  } catch (error) {
    console.error("[Auth] Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Verifies an Ed25519 signature from a Solana wallet
 */
function verifySignature(
  walletAddress: string,
  signature: string,
  message: string,
): boolean {
  try {
    const publicKey = bs58.decode(walletAddress);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
  } catch (error) {
    console.error("[Auth] Signature verification failed:", error);
    return false;
  }
}
