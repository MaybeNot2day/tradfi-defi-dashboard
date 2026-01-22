/**
 * TradFi vs DeFi Pairs Catalog
 * Static metadata for all comparison pairs used across the dashboard.
 */

export type EntityType = "tradfi" | "defi";

export type Category =
  | "Exchange"
  | "Bank"
  | "Lending"
  | "Asset Management"
  | "Liquid Staking"
  | "Alt Asset Management"
  | "RWA/Tokenization"
  | "Brokerage"
  | "Perps DEX"
  | "Custody/Bank"
  | "Stablecoin Issuer"
  | "Derivatives"
  | "Stable Swap"
  | "Rates Trading"
  | "Bond Trading"
  | "Yield Trading"
  | "Options Exchange"
  | "Synths"
  | "DEX Aggregator";

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  category: Category;
  /** Ticker symbol for TradFi, protocol slug for DeFi (DefiLlama/CoinGecko) */
  ticker?: string;
  /** CoinGecko ID for DeFi tokens */
  coingeckoId?: string;
  /** DefiLlama protocol slug */
  defiLlamaId?: string;
}

export interface Pair {
  id: number;
  theme: string;
  tradfi: Entity;
  defi: Entity;
}

export const PAIRS: Pair[] = [
  {
    id: 1,
    theme: "Market Infrastructure",
    tradfi: {
      id: "nasdaq",
      name: "Nasdaq",
      type: "tradfi",
      category: "Exchange",
      ticker: "NDAQ",
    },
    defi: {
      id: "uniswap",
      name: "Uniswap",
      type: "defi",
      category: "Exchange",
      coingeckoId: "uniswap",
      defiLlamaId: "uniswap",
    },
  },
  {
    id: 2,
    theme: "Money Markets",
    tradfi: {
      id: "jpmorgan",
      name: "JPMorgan",
      type: "tradfi",
      category: "Bank",
      ticker: "JPM",
    },
    defi: {
      id: "aave",
      name: "Aave",
      type: "defi",
      category: "Lending",
      coingeckoId: "aave",
      defiLlamaId: "aave",
    },
  },
  {
    id: 3,
    theme: "Asset Management",
    tradfi: {
      id: "blackrock",
      name: "BlackRock",
      type: "tradfi",
      category: "Asset Management",
      ticker: "BLK",
    },
    defi: {
      id: "lido",
      name: "Lido",
      type: "defi",
      category: "Liquid Staking",
      coingeckoId: "lido-dao",
      defiLlamaId: "lido",
    },
  },
  {
    id: 4,
    theme: "Private Credit",
    tradfi: {
      id: "apollo",
      name: "Apollo Global",
      type: "tradfi",
      category: "Alt Asset Management",
      ticker: "APO",
    },
    defi: {
      id: "ondo",
      name: "Ondo Finance",
      type: "defi",
      category: "RWA/Tokenization",
      coingeckoId: "ondo-finance",
      defiLlamaId: "ondo-finance",
    },
  },
  {
    id: 5,
    theme: "Prime Brokerage",
    tradfi: {
      id: "ibkr",
      name: "Interactive Brokers",
      type: "tradfi",
      category: "Brokerage",
      ticker: "IBKR",
    },
    defi: {
      id: "hyperliquid",
      name: "Hyperliquid",
      type: "defi",
      category: "Perps DEX",
      coingeckoId: "hyperliquid",
      defiLlamaId: "hyperliquid",
    },
  },
  {
    id: 6,
    theme: "Treasury & Issuance",
    tradfi: {
      id: "statestreet",
      name: "State Street",
      type: "tradfi",
      category: "Custody/Bank",
      ticker: "STT",
    },
    defi: {
      id: "makerdao",
      name: "Sky (Maker)",
      type: "defi",
      category: "Stablecoin Issuer",
      coingeckoId: "sky", // Use SKY token FDV (MKR migrated to SKY)
      defiLlamaId: "makerdao",
    },
  },
  {
    id: 7,
    theme: "Derivatives",
    tradfi: {
      id: "cme",
      name: "CME Group",
      type: "tradfi",
      category: "Derivatives",
      ticker: "CME",
    },
    defi: {
      id: "gmx",
      name: "GMX",
      type: "defi",
      category: "Perps DEX",
      coingeckoId: "gmx",
      defiLlamaId: "gmx",
    },
  },
  {
    id: 8,
    theme: "Deep Liquidity",
    tradfi: {
      id: "tradeweb",
      name: "Tradeweb",
      type: "tradfi",
      category: "Rates Trading",
      ticker: "TW",
    },
    defi: {
      id: "curve",
      name: "Curve",
      type: "defi",
      category: "Stable Swap",
      coingeckoId: "curve-dao-token",
      defiLlamaId: "curve-dex",
    },
  },
  {
    id: 9,
    theme: "Fixed Income",
    tradfi: {
      id: "marketaxess",
      name: "MarketAxess",
      type: "tradfi",
      category: "Bond Trading",
      ticker: "MKTX",
    },
    defi: {
      id: "pendle",
      name: "Pendle",
      type: "defi",
      category: "Yield Trading",
      coingeckoId: "pendle",
      defiLlamaId: "pendle",
    },
  },
  {
    id: 10,
    theme: "Trade Execution",
    tradfi: {
      id: "cboe",
      name: "Cboe Global",
      type: "tradfi",
      category: "Options Exchange",
      ticker: "CBOE",
    },
    defi: {
      id: "jupiter",
      name: "Jupiter",
      type: "defi",
      category: "DEX Aggregator",
      coingeckoId: "jupiter-exchange-solana",
      defiLlamaId: "jupiter",
    },
  },
];

/** Get all unique categories from pairs */
export function getCategories(): string[] {
  const categories = new Set<string>();
  PAIRS.forEach((pair) => {
    categories.add(pair.tradfi.category);
    categories.add(pair.defi.category);
  });
  return Array.from(categories);
}

/** Get all entities as a flat array */
export function getAllEntities(): Entity[] {
  return PAIRS.flatMap((pair) => [pair.tradfi, pair.defi]);
}

/** Find a pair by ID */
export function getPairById(id: number): Pair | undefined {
  return PAIRS.find((pair) => pair.id === id);
}

/** Find an entity by ID */
export function getEntityById(id: string): Entity | undefined {
  return getAllEntities().find((entity) => entity.id === id);
}
