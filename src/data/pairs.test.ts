import { describe, it, expect } from "vitest";
import {
  PAIRS,
  getCategories,
  getAllEntities,
  getPairById,
  getEntityById,
} from "./pairs";

describe("PAIRS constant", () => {
  it("contains exactly 10 pairs", () => {
    expect(PAIRS).toHaveLength(10);
  });

  it("each pair has required properties", () => {
    PAIRS.forEach((pair) => {
      expect(pair).toHaveProperty("id");
      expect(pair).toHaveProperty("theme");
      expect(pair).toHaveProperty("tradfi");
      expect(pair).toHaveProperty("defi");
    });
  });

  it("pair IDs are sequential from 1 to 10", () => {
    const ids = PAIRS.map((p) => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("all tradfi entities have type 'tradfi'", () => {
    PAIRS.forEach((pair) => {
      expect(pair.tradfi.type).toBe("tradfi");
    });
  });

  it("all defi entities have type 'defi'", () => {
    PAIRS.forEach((pair) => {
      expect(pair.defi.type).toBe("defi");
    });
  });

  it("all tradfi entities have a ticker", () => {
    PAIRS.forEach((pair) => {
      expect(pair.tradfi.ticker).toBeDefined();
      expect(typeof pair.tradfi.ticker).toBe("string");
    });
  });

  it("all defi entities have coingeckoId and defiLlamaId", () => {
    PAIRS.forEach((pair) => {
      expect(pair.defi.coingeckoId).toBeDefined();
      expect(pair.defi.defiLlamaId).toBeDefined();
    });
  });
});

describe("getCategories", () => {
  it("returns an array of category strings", () => {
    const categories = getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    categories.forEach((cat) => {
      expect(typeof cat).toBe("string");
    });
  });

  it("includes Exchange category", () => {
    const categories = getCategories();
    expect(categories).toContain("Exchange");
  });
});

describe("getAllEntities", () => {
  it("returns 20 entities (10 pairs x 2)", () => {
    const entities = getAllEntities();
    expect(entities).toHaveLength(20);
  });

  it("returns 10 tradfi and 10 defi entities", () => {
    const entities = getAllEntities();
    const tradfi = entities.filter((e) => e.type === "tradfi");
    const defi = entities.filter((e) => e.type === "defi");
    expect(tradfi).toHaveLength(10);
    expect(defi).toHaveLength(10);
  });

  it("all entities have unique IDs", () => {
    const entities = getAllEntities();
    const ids = entities.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("getPairById", () => {
  it("returns the correct pair for valid ID", () => {
    const pair = getPairById(1);
    expect(pair).toBeDefined();
    expect(pair?.id).toBe(1);
    expect(pair?.theme).toBe("Market Infrastructure");
  });

  it("returns undefined for invalid ID", () => {
    expect(getPairById(0)).toBeUndefined();
    expect(getPairById(11)).toBeUndefined();
    expect(getPairById(999)).toBeUndefined();
  });
});

describe("getEntityById", () => {
  it("returns the correct entity for valid ID", () => {
    const nasdaq = getEntityById("nasdaq");
    expect(nasdaq).toBeDefined();
    expect(nasdaq?.name).toBe("Nasdaq");
    expect(nasdaq?.type).toBe("tradfi");

    const uniswap = getEntityById("uniswap");
    expect(uniswap).toBeDefined();
    expect(uniswap?.name).toBe("Uniswap");
    expect(uniswap?.type).toBe("defi");
  });

  it("returns undefined for invalid ID", () => {
    expect(getEntityById("invalid")).toBeUndefined();
    expect(getEntityById("")).toBeUndefined();
  });
});

describe("specific pairs validation", () => {
  it("pair 1 is Nasdaq vs Uniswap", () => {
    const pair = getPairById(1);
    expect(pair?.tradfi.name).toBe("Nasdaq");
    expect(pair?.tradfi.ticker).toBe("NDAQ");
    expect(pair?.defi.name).toBe("Uniswap");
    expect(pair?.defi.coingeckoId).toBe("uniswap");
  });

  it("pair 2 is JPMorgan vs Aave", () => {
    const pair = getPairById(2);
    expect(pair?.tradfi.name).toBe("JPMorgan");
    expect(pair?.tradfi.ticker).toBe("JPM");
    expect(pair?.defi.name).toBe("Aave");
    expect(pair?.defi.coingeckoId).toBe("aave");
  });
});
