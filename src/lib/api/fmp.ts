/**
 * Financial Modeling Prep API Client
 * Fetches TradFi fundamentals: market cap, revenue, etc.
 * API Docs: https://site.financialmodelingprep.com/developer/docs
 *
 * Uses the new "stable" API endpoints (as of 2025)
 */

// FMP stable API endpoint (as of 2025)
const FMP_STABLE_URL = "https://financialmodelingprep.com/stable";

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

interface FMPRatiosTTM {
  // FMP stable API uses priceToEarningsRatioTTM not peRatioTTM
  priceToEarningsRatioTTM: number;
  priceToSalesRatioTTM: number;
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
  const url = `${FMP_STABLE_URL}/quote?symbol=${ticker}&apikey=${apiKey}`;

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
  const url = `${FMP_STABLE_URL}/income-statement?symbol=${ticker}&period=annual&limit=4&apikey=${apiKey}`;

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
  const url = `${FMP_STABLE_URL}/key-metrics-ttm?symbol=${ticker}&apikey=${apiKey}`;

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
 * Fetch ratios TTM (primary source for P/E and P/S ratios).
 * Uses stable API endpoint which returns priceToEarningsRatioTTM.
 */
async function fetchRatiosTTM(
  ticker: string,
  apiKey: string
): Promise<FMPRatiosTTM | null> {
  const url = `${FMP_STABLE_URL}/ratios-ttm?symbol=${ticker}&apikey=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (Array.isArray(data) && data.length > 0) {
    const ratios = data[0];
    // Check for the correct field name
    if (ratios.priceToEarningsRatioTTM !== undefined || ratios.priceToSalesRatioTTM !== undefined) {
      return ratios as FMPRatiosTTM;
    }
  }

  return null;
}

/**
 * Fetch all TradFi data for a ticker.
 */
export async function fetchTradFiData(ticker: string): Promise<TradFiData | null> {
  const apiKey = process.env.FMP_API_KEY;
  const DEBUG = process.env.FMP_DEBUG === "true";

  if (!apiKey) {
    console.error("FMP_API_KEY not configured");
    return null;
  }

  try {
    // Fetch quote, income, key-metrics, and ratios in parallel
    const [quote, incomeStatements, keyMetrics, ratiosTTM] = await Promise.all([
      fetchQuote(ticker, apiKey),
      fetchIncomeStatement(ticker, apiKey),
      fetchKeyMetricsTTM(ticker, apiKey),
      fetchRatiosTTM(ticker, apiKey),
    ]);

    if (DEBUG) {
      console.log(`\n[FMP DEBUG] ${ticker}:`);
      console.log(`  Quote: marketCap=${quote?.marketCap}, price=${quote?.price}`);
      console.log(`  KeyMetrics: peRatio=${keyMetrics?.peRatio}, psRatio=${keyMetrics?.priceToSalesRatio}`);
      console.log(`  RatiosTTM: peRatioTTM=${ratiosTTM?.priceToEarningsRatioTTM}, psRatioTTM=${ratiosTTM?.priceToSalesRatioTTM}`);
      if (incomeStatements?.[0]) {
        console.log(`  Income[0]: revenue=${incomeStatements[0].revenue}, netIncome=${incomeStatements[0].netIncome}, date=${incomeStatements[0].date}`);
      }
    }

    if (!quote) {
      return null;
    }

    const marketCap = quote.marketCap;

    // Use most recent income statement for TTM revenue
    const latestIncome = incomeStatements?.[0];
    const ttmRevenue = latestIncome?.revenue ?? 0;
    const ttmNetIncome = latestIncome?.netIncome ?? 0;

    // Calculate fallback ratios (used if FMP endpoints don't return them)
    const calculatedPeRatio = ttmNetIncome > 0 ? marketCap / ttmNetIncome : null;
    const calculatedPsRatio = ttmRevenue > 0 ? marketCap / ttmRevenue : null;

    // Priority for P/E: ratios-ttm (priceToEarningsRatioTTM) > key-metrics-ttm > calculated
    // ratios-ttm endpoint has the most accurate TTM P/E ratio from FMP
    const peRatio = ratiosTTM?.priceToEarningsRatioTTM ?? keyMetrics?.peRatio ?? calculatedPeRatio;
    const psRatio = ratiosTTM?.priceToSalesRatioTTM ?? keyMetrics?.priceToSalesRatio ?? calculatedPsRatio;

    const peSource = ratiosTTM?.priceToEarningsRatioTTM ? "ratios-ttm" : keyMetrics?.peRatio ? "key-metrics" : "calculated";

    if (DEBUG) {
      console.log(`  Final: marketCap=${marketCap}, P/E=${peRatio?.toFixed(2)} (source: ${peSource})`);
    }

    return {
      ticker,
      name: quote.name,
      marketCap,
      ttmRevenue,
      ttmNetIncome,
      peRatio,
      psRatio,
      rawQuote: quote,
      rawIncome: incomeStatements,
    };
  } catch (error) {
    console.error(`Error fetching TradFi data for ${ticker}:`, error);
    return null;
  }
}
