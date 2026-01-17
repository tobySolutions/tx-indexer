import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "itx-indexer - The Solana Transaction Indexer";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        position: "relative",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Grid background pattern */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Subtle gradient overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(255,52,2,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 60px",
          position: "relative",
        }}
      >
        {/* Main title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 64,
            fontWeight: 700,
            color: "#f5f5f5",
            marginBottom: 24,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#ff3402" }}>//</span>
          <span style={{ marginLeft: 12 }}>the solana transaction indexer</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#a3a3a3",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          transforms raw blockchain data into human-readable transactions.
          swaps, transfers, NFT mints, all classified automatically.
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 48,
          }}
        >
          {["swap", "transfer", "nft mint", "stake", "bridge", "airdrop"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 24px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 9999,
                  fontSize: 18,
                  color: "#d4d4d4",
                }}
              >
                {tag}
              </div>
            ),
          )}
        </div>

        {/* Branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 56,
            fontSize: 20,
            color: "#737373",
          }}
        >
          <span style={{ color: "#ff3402", fontWeight: 600 }}>itx-indexer</span>
          <span>|</span>
          <span>open source SDK for developers</span>
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
