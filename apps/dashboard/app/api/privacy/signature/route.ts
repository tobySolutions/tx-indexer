import { NextRequest, NextResponse } from "next/server";
import { getRedis, isRedisConfigured } from "@/lib/redis";

const SIGNATURE_TTL_SECONDS = 7 * 24 * 60 * 60;
const SIGNATURE_PREFIX = "privacy:signature:";

function getCacheKey(publicKey: string): string {
  return `${SIGNATURE_PREFIX}${publicKey}`;
}

export async function GET(request: NextRequest) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Signature cache unavailable" },
      { status: 503 },
    );
  }

  const publicKey = request.nextUrl.searchParams.get("publicKey");
  if (!publicKey) {
    return NextResponse.json({ error: "Missing publicKey" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Signature cache unavailable" },
      { status: 503 },
    );
  }

  const signature = await redis.get<string>(getCacheKey(publicKey));
  if (!signature) {
    return NextResponse.json({ signature: null });
  }

  return NextResponse.json({ signature });
}

export async function POST(request: NextRequest) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Signature cache unavailable" },
      { status: 503 },
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Signature cache unavailable" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    publicKey?: string;
    signature?: string;
  };

  if (!body.publicKey || !body.signature) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await redis.set(getCacheKey(body.publicKey), body.signature, {
    ex: SIGNATURE_TTL_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
