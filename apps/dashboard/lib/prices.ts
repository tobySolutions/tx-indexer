const JUPITER_PRICE_API = "https://lite-api.jup.ag/price/v3/price";

interface JupiterPriceData {
  usdPrice: number;
  decimals: number;
}

type PriceResponse = Record<string, JupiterPriceData>;

export async function fetchTokenPrices(
  mints: string[],
): Promise<Map<string, number>> {
  if (mints.length === 0) {
    return new Map();
  }

  const prices = new Map<string, number>();
  const ids = mints.join(",");

  try {
    const response = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error("[Prices] Failed to fetch from Jupiter:", response.status);
      return prices;
    }

    const data: PriceResponse = await response.json();

    for (const [mint, priceData] of Object.entries(data)) {
      if (priceData?.usdPrice) {
        prices.set(mint, priceData.usdPrice);
      }
    }
  } catch (error) {
    console.error("[Prices] Error fetching token prices:", error);
  }

  return prices;
}
