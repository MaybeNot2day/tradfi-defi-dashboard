/**
 * DefiLlama API Client
 * Fetches DeFi protocol fees and revenue data.
 * API Docs: https://defillama.com/docs/api (keyless)
 */

const DEFILLAMA_BASE_URL = "https://api.llama.fi";

interface DefiLlamaProtocolFees {
  name: string;
  defillamaId: string;
  disabled: boolean;
  displayName: string;
  module: string;
  category: string;
  logo: string;
  chains: string[];
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
  revenue24h: number | null;
  revenue7d: number | null;
  revenue30d: number | null;
  methodologyURL: string;
}

interface DefiLlamaFeesResponse {
  protocols: DefiLlamaProtocolFees[];
}

interface DefiLlamaSummaryResponse {
  id: string;
  name: string;
  displayName: string;
  total24h: number | null;
  total48hto24h: number | null;
  total7d: number | null;
  total30d: number | null;
  totalAllTime: number | null;
  revenue24h: number | null;
  revenue7d: number | null;
  revenue30d: number | null;
  dailyRevenue: number | null;
  change_1d: number | null;
  change_7d: number | null;
  change_1m: number | null;
}

export interface DeFiFeesData {
  protocol: string;
  displayName: string;
  fees24h: number | null;
  fees7d: number | null;
  fees30d: number | null;
  feesAllTime: number | null;
  revenue24h: number | null;
  revenue7d: number | null;
  revenue30d: number | null;
  annualizedFees: number | null;
  annualizedRevenue: number | null;
  raw: DefiLlamaSummaryResponse | null;
}

/**
 * Fetch fees and revenue summary for a specific protocol.
 * Makes two API calls:
 * - dataType=dailyFees for total fees (used for P/S calculation)
 * - dataType=dailyRevenue for protocol revenue (used for P/E calculation)
 *
 * Note: For protocols where 100% of fees go to LPs (like Uniswap),
 * revenue will be 0 or very low, making P/E undefined/infinite.
 */
export async function fetchDeFiFeesData(protocolSlug: string): Promise<DeFiFeesData | null> {
  try {
    // Fetch both fees and revenue in parallel
    const [feesResponse, revenueResponse] = await Promise.all([
      fetch(`${DEFILLAMA_BASE_URL}/summary/fees/${protocolSlug}?dataType=dailyFees`),
      fetch(`${DEFILLAMA_BASE_URL}/summary/fees/${protocolSlug}?dataType=dailyRevenue`),
    ]);

    if (!feesResponse.ok) {
      console.error(`DefiLlama fees error for ${protocolSlug}: ${feesResponse.status}`);
      return null;
    }

    const feesData = await feesResponse.json() as DefiLlamaSummaryResponse;

    // Revenue endpoint might fail for some protocols - that's OK
    let revenueData: DefiLlamaSummaryResponse | null = null;
    if (revenueResponse.ok) {
      revenueData = await revenueResponse.json() as DefiLlamaSummaryResponse;
    }

    return parseFeesAndRevenueResponse(protocolSlug, feesData, revenueData);
  } catch (error) {
    console.error(`Error fetching DefiLlama data for ${protocolSlug}:`, error);
    return null;
  }
}

function parseFeesAndRevenueResponse(
  protocolSlug: string,
  feesData: DefiLlamaSummaryResponse,
  revenueData: DefiLlamaSummaryResponse | null
): DeFiFeesData {
  // Fees come from the dailyFees endpoint
  const fees24h = feesData.total24h;
  const annualizedFees = fees24h ? fees24h * 365 : null;

  // Revenue comes from the dailyRevenue endpoint (total24h field when dataType=dailyRevenue)
  const revenue24h = revenueData?.total24h ?? null;
  const annualizedRevenue = revenue24h ? revenue24h * 365 : null;

  return {
    protocol: protocolSlug,
    displayName: feesData.displayName || feesData.name || protocolSlug,
    fees24h,
    fees7d: feesData.total7d,
    fees30d: feesData.total30d,
    feesAllTime: feesData.totalAllTime,
    revenue24h,
    revenue7d: revenueData?.total7d ?? null,
    revenue30d: revenueData?.total30d ?? null,
    annualizedFees,
    annualizedRevenue,
    raw: feesData,
  };
}

/**
 * Fetch all protocols fees overview (useful for validation).
 */
export async function fetchAllProtocolFees(): Promise<DefiLlamaProtocolFees[]> {
  try {
    const url = `${DEFILLAMA_BASE_URL}/overview/fees`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`DefiLlama overview error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as DefiLlamaFeesResponse;
    return data.protocols || [];
  } catch (error) {
    console.error("Error fetching DefiLlama overview:", error);
    return [];
  }
}

/**
 * Find a protocol by various identifiers.
 */
export async function findProtocol(
  identifier: string
): Promise<DefiLlamaProtocolFees | null> {
  const allProtocols = await fetchAllProtocolFees();

  const normalized = identifier.toLowerCase();

  return (
    allProtocols.find(
      (p) =>
        p.defillamaId?.toLowerCase() === normalized ||
        p.name?.toLowerCase() === normalized ||
        p.displayName?.toLowerCase() === normalized ||
        p.module?.toLowerCase() === normalized
    ) || null
  );
}
