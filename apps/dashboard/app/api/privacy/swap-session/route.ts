import { NextRequest, NextResponse } from "next/server";
import { getRedis, isRedisConfigured } from "@/lib/redis";

const SWAP_SESSION_TTL_SECONDS = 48 * 60 * 60;
const SWAP_SESSION_PREFIX = "privacy:swap:";

function getCacheKey(publicKey: string): string {
  return `${SWAP_SESSION_PREFIX}${publicKey}`;
}

export async function GET(request: NextRequest) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Swap recovery unavailable" },
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
      { error: "Swap recovery unavailable" },
      { status: 503 },
    );
  }

  const session = await redis.get<string>(getCacheKey(publicKey));
  if (!session) {
    return NextResponse.json({ session: null });
  }

  const parsed =
    typeof session === "string" ? (JSON.parse(session) as unknown) : session;

  return NextResponse.json({ session: parsed });
}

export async function POST(request: NextRequest) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Swap recovery unavailable" },
      { status: 503 },
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Swap recovery unavailable" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    publicKey?: string;
    session?: unknown;
  };

  if (!body.publicKey || !body.session) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await redis.set(getCacheKey(body.publicKey), JSON.stringify(body.session), {
    ex: SWAP_SESSION_TTL_SECONDS,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Swap recovery unavailable" },
      { status: 503 },
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Swap recovery unavailable" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { publicKey?: string };
  if (!body.publicKey) {
    return NextResponse.json({ error: "Missing publicKey" }, { status: 400 });
  }

  await redis.del(getCacheKey(body.publicKey));
  return NextResponse.json({ ok: true });
}
