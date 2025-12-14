import { ImageResponse } from "next/og";
import { indexer } from "@/lib/indexer";
import { signature } from "@solana/kit";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";
export const alt = "Transaction Details";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function formatAmount(amount: number, symbol: string) {
  const stablecoins = ["USDC", "USDT", "USDH", "PAI", "UXD", "EURC", "USDG"];
  const isStablecoin = stablecoins.includes(symbol.toUpperCase());
  return isStablecoin ? amount.toFixed(2) : amount.toFixed(4);
}

export default async function Image({
  params,
}: {
  params: Promise<{ sig: string }>;
}) {
  const { sig } = await params;

  try {
    const transaction = await indexer.getTransaction(signature(sig));

    if (!transaction) {
      return new ImageResponse(
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            backgroundColor: "#fafafa",
            padding: "10px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              borderRadius: "32px",
              backgroundColor: "#0a0a0a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "48px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              transaction not found
            </div>
          </div>
        </div>,
        { ...size }
      );
    }

    const { tx, classification } = transaction;
    const isSuccess = !tx.err;
    const primaryAmount = classification.primaryAmount;
    const secondaryAmount = classification.secondaryAmount;

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          backgroundColor: "#fafafa",
          padding: "10px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderRadius: "32px",
            backgroundColor: "#0a0a0a",
            position: "relative",
            overflow: "hidden",
            backgroundImage:
              "radial-gradient(circle 600px at 105% -10%, rgba(239, 68, 68, 0.4) 0%, transparent 70%), radial-gradient(circle 500px at -5% 110%, rgba(239, 68, 68, 0.3) 0%, transparent 70%), linear-gradient(rgba(239, 68, 68, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.03) 1px, transparent 1px)",
            backgroundSize: "100% 100%, 100% 100%, 50px 50px, 50px 50px",
            backgroundPosition: "0 0, 0 0, 0 0, 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              padding: "80px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "48px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "64px",
                    fontWeight: "bold",
                    color: "#ef4444",
                  }}
                >
                  {"//"}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "48px",
                    fontWeight: "bold",
                    color: "white",
                    textTransform: "capitalize",
                  }}
                >
                  {classification.primaryType.replace("_", " ")}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  padding: "12px 24px",
                  background: isSuccess
                    ? "rgba(34, 197, 94, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  border: isSuccess
                    ? "1px solid rgba(34, 197, 94, 0.3)"
                    : "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  fontSize: "20px",
                  color: isSuccess
                    ? "rgba(134, 239, 172, 0.9)"
                    : "rgba(252, 165, 165, 0.9)",
                  fontWeight: "600",
                }}
              >
                {isSuccess ? "Success" : "Failed"}
              </div>
            </div>

            {primaryAmount && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "32px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "56px",
                    fontWeight: "700",
                    color: "white",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {formatAmount(
                    primaryAmount.amountUi,
                    primaryAmount.token.symbol
                  )}{" "}
                  {primaryAmount.token.symbol}
                </div>
                {secondaryAmount && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      fontSize: "32px",
                      color: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    <div style={{ display: "flex" }}>→</div>
                    <div style={{ display: "flex" }}>
                      {formatAmount(
                        secondaryAmount.amountUi,
                        secondaryAmount.token.symbol
                      )}{" "}
                      {secondaryAmount.token.symbol}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {tx.protocol && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "24px",
                    color: "rgba(255, 255, 255, 0.7)",
                  }}
                >
                  <div style={{ display: "flex" }}>via</div>
                  <div style={{ display: "flex", color: "white", fontWeight: "600" }}>
                    {tx.protocol.name}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                {formatDate(tx.blockTime)}
              </div>
            </div>
          </div>
        </div>
      </div>,
      { ...size }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          backgroundColor: "#fafafa",
          padding: "10px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            borderRadius: "32px",
            backgroundColor: "#0a0a0a",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "48px",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.9)",
            }}
          >
            error loading transaction
          </div>
        </div>
      </div>,
      { ...size }
    );
  }
}
