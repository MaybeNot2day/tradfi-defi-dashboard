/**
 * CoinGecko API Client
 * Fetches DeFi token data: FDV (Fully Diluted Valuation)
 * API Docs: https://www.coingecko.com/en/api/documentation
 */

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const COINGECKO_PRO_URL = "https://pro-api.coingecko.com/api/v3";

interface CoinGeckoMarketData {
  current_price: { usd: number };
  market_cap: { usd: number };
  fully_diluted_valuation: { usd: number | null };
  total_volume: { usd: number };
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
}

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  market_data: CoinGeckoMarketData;
}

export interface DeFiTokenData {
  id: string;
  symbol: string;
  name: string;
  fdv: number | null;
  marketCap: number;
  price: number;
  circulatingSupply: number;
  totalSupply: number | null;
  raw: CoinGeckoCoin | null;
}

/**
 * Add rate limiting delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch coin data from CoinGecko.
 */
export async function fetchDeFiTokenData(coinId: string): Promise<DeFiTokenData | null> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const baseUrl = apiKey ? COINGECKO_PRO_URL : COINGECKO_BASE_URL;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers["x-cg-pro-api-key"] = apiKey;
  }

  try {
    // Rate limit: free tier allows ~10-30 calls/minute
    await delay(apiKey ? 100 : 2500);

    const url = `${baseUrl}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;

    const response = await fetch(url, { headers });

    if (response.status === 429) {
      console.error(`CoinGecko rate limited for ${coinId}, waiting...`);
      await delay(60000); // Wait 1 minute
      return fetchDeFiTokenData(coinId); // Retry
    }

    if (!response.ok) {
      console.error(`CoinGecko error for ${coinId}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as CoinGeckoCoin;

    const marketData = data.market_data;
    if (!marketData) {
      console.error(`CoinGecko no market data for ${coinId}`);
      return null;
    }

    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      fdv: marketData.fully_diluted_valuation?.usd ?? null,
      marketCap: marketData.market_cap?.usd ?? 0,
      price: marketData.current_price?.usd ?? 0,
      circulatingSupply: marketData.circulating_supply ?? 0,
      totalSupply: marketData.total_supply,
      raw: data,
    };
  } catch (error) {
    console.error(`Error fetching CoinGecko data for ${coinId}:`, error);
    return null;
  }
}
