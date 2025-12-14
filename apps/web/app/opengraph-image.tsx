import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "itx - Solana Transaction Classifier";
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
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            left: "-5%",
            width: "500px",
            height: "500px",
            background:
              "radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(rgba(239, 68, 68, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.03) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "80px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginBottom: "60px",
            }}
          >
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#ef4444",
              }}
            >
              {"//"}
            </div>
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "white",
                letterSpacing: "-0.04em",
              }}
            >
              itx
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              maxWidth: "900px",
            }}
          >
            <div
              style={{
                fontSize: "56px",
                fontWeight: "700",
                lineHeight: 1.2,
                color: "white",
                letterSpacing: "-0.02em",
              }}
            >
              transform blockchain data into readable financials
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  padding: "12px 24px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                auto classification
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                protocol detection
              </div>
              <div
                style={{
                  padding: "12px 24px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                accounting-ready
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "auto",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              open source solana transaction sdk
            </div>
          </div>
        </div>
      </div>
    </div>,
    { ...size }
  );
}
