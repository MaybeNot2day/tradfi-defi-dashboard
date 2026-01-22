/**
 * Financial Modeling Prep API Client
 * Fetches TradFi fundamentals: market cap, revenue, etc.
 * API Docs: https://site.financialmodelingprep.com/developer/docs
 *
 * Uses the new "stable" API endpoints (as of 2025)
 */

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
}

interface FMPIncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  netIncome: number;
  operatingIncome: number;
}

interface FMPKeyMetrics {
  symbol: string;
  date: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  peRatio: number;
  priceToSalesRatio: number;
}

export interface TradFiData {
  ticker: string;
  name: string;
  marketCap: number;
  ttmRevenue: number;
  ttmNetIncome: number;
  peRatio: number | null;
  psRatio: number | null;
  rawQuote: FMPQuote | null;
  rawIncome: FMPIncomeStatement[] | null;
}

/**
 * Fetch quote data for a ticker.
 * New stable endpoint: /stable/quote?symbol=TICKER
 */
async function fetchQuote(ticker: string, apiKey: string): Promise<FMPQuote | null> {
  const url = `${FMP_BASE_URL}/quote?symbol=${ticker}&apikey=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error(`FMP quote error for ${ticker}: ${response.status}`, text.slice(0, 200));
    return null;
  }

  const data = await response.json();

  // New API may return object or array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.error(`FMP quote empty for ${ticker}`);
      return null;
    }
    return data[0] as FMPQuote;
  }

  // Single object response
  if (data && data.symbol) {
    return data as FMPQuote;
  }

  console.error(`FMP quote unexpected format for ${ticker}:`, data);
  return null;
}

/**
 * Fetch TTM income statement data.
 * New stable endpoint: /stable/income-statement?symbol=TICKER
 */
async function fetchIncomeStatement(
  ticker: string,
  apiKey: string
): Promise<FMPIncomeStatement[] | null> {
  const url = `${FMP_BASE_URL}/income-statement?symbol=${ticker}&period=annual&limit=4&apikey=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error(`FMP income statement error for ${ticker}: ${response.status}`, text.slice(0, 200));
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.error(`FMP income statement empty for ${ticker}`);
    return null;
  }

  return data as FMPIncomeStatement[];
}

/**
 * Fetch key metrics including ratios (TTM).
 * New stable endpoint: /stable/key-metrics-ttm?symbol=TICKER
 */
async function fetchKeyMetricsTTM(
  ticker: string,
  apiKey: string
): Promise<FMPKeyMetrics | null> {
  const url = `${FMP_BASE_URL}/key-metrics-ttm?symbol=${ticker}&apikey=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    // Key metrics TTM may not be available for all tickers, don't log as error
    return null;
  }

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0) {
    return data[0] as FMPKeyMetrics;
  }

  if (data && data.symbol) {
    return data as FMPKeyMetrics;
  }

  return null;
}

/**
 * Fetch all TradFi data for a ticker.
 */
export async function fetchTradFiData(ticker: string): Promise<TradFiData | null> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    console.error("FMP_API_KEY not configured");
    return null;
  }

  try {
    // Fetch quote and income in parallel
    const [quote, incomeStatements, keyMetrics] = await Promise.all([
      fetchQuote(ticker, apiKey),
      fetchIncomeStatement(ticker, apiKey),
      fetchKeyMetricsTTM(ticker, apiKey),
    ]);

    if (!quote) {
      return null;
    }

    // Use most recent income statement for TTM revenue
    const latestIncome = incomeStatements?.[0];
    const ttmRevenue = latestIncome?.revenue ?? 0;
    const ttmNetIncome = latestIncome?.netIncome ?? 0;

    // Calculate ratios
    const peRatio = ttmNetIncome > 0 ? quote.marketCap / ttmNetIncome : null;
    const psRatio = ttmRevenue > 0 ? quote.marketCap / ttmRevenue : null;

    return {
      ticker,
      name: quote.name,
      marketCap: quote.marketCap,
      ttmRevenue,
      ttmNetIncome,
      peRatio: keyMetrics?.peRatio ?? peRatio,
      psRatio: keyMetrics?.priceToSalesRatio ?? psRatio,
      rawQuote: quote,
      rawIncome: incomeStatements,
    };
  } catch (error) {
    console.error(`Error fetching TradFi data for ${ticker}:`, error);
    return null;
  }
}
