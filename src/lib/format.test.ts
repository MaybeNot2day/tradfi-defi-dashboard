import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatRatio,
  formatPercent,
  formatSpread,
  formatDate,
  getValueColorClass,
} from "./format";

describe("formatCurrency", () => {
  it("returns N/A for null or undefined", () => {
    expect(formatCurrency(null)).toBe("N/A");
    expect(formatCurrency(undefined)).toBe("N/A");
  });

  it("formats trillions correctly", () => {
    expect(formatCurrency(1_500_000_000_000)).toBe("$1.5T");
    expect(formatCurrency(2_000_000_000_000)).toBe("$2.0T");
  });

  it("formats billions correctly", () => {
    expect(formatCurrency(42_000_000_000)).toBe("$42.0B");
    expect(formatCurrency(1_500_000_000)).toBe("$1.5B");
  });

  it("formats millions correctly", () => {
    expect(formatCurrency(500_000_000)).toBe("$500.0M");
    expect(formatCurrency(1_500_000)).toBe("$1.5M");
  });

  it("formats thousands correctly", () => {
    expect(formatCurrency(50_000)).toBe("$50.0K");
    expect(formatCurrency(1_500)).toBe("$1.5K");
  });

  it("formats small values correctly", () => {
    expect(formatCurrency(500)).toBe("$500");
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatRatio", () => {
  it("returns N/A for null or undefined", () => {
    expect(formatRatio(null)).toBe("N/A");
    expect(formatRatio(undefined)).toBe("N/A");
  });

  it("formats with default decimal places", () => {
    expect(formatRatio(12.345)).toBe("12.3");
    expect(formatRatio(5.0)).toBe("5.0");
  });

  it("respects custom decimal places", () => {
    expect(formatRatio(12.3456, 2)).toBe("12.35");
    expect(formatRatio(12.3456, 0)).toBe("12");
  });
});

describe("formatPercent", () => {
  it("returns N/A for null or undefined", () => {
    expect(formatPercent(null)).toBe("N/A");
    expect(formatPercent(undefined)).toBe("N/A");
  });

  it("formats positive percentages with + sign", () => {
    expect(formatPercent(0.15)).toBe("+15.0%");
    expect(formatPercent(1.0)).toBe("+100.0%");
  });

  it("formats negative percentages", () => {
    expect(formatPercent(-0.15)).toBe("-15.0%");
    expect(formatPercent(-0.5)).toBe("-50.0%");
  });

  it("formats zero correctly", () => {
    expect(formatPercent(0)).toBe("+0.0%");
  });
});

describe("formatSpread", () => {
  it("returns N/A for null or undefined", () => {
    expect(formatSpread(null)).toBe("N/A");
    expect(formatSpread(undefined)).toBe("N/A");
  });

  it("formats positive spreads with + sign", () => {
    expect(formatSpread(5.5)).toBe("+5.5");
    expect(formatSpread(10.0)).toBe("+10.0");
  });

  it("formats negative spreads", () => {
    expect(formatSpread(-3.2)).toBe("-3.2");
  });

  it("formats zero correctly", () => {
    expect(formatSpread(0)).toBe("+0.0");
  });
});

describe("formatDate", () => {
  it("formats date strings correctly", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats Date objects correctly", () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const result = formatDate(date);
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("getValueColorClass", () => {
  it("returns muted class for null or undefined", () => {
    expect(getValueColorClass(null)).toBe("text-foreground-muted");
    expect(getValueColorClass(undefined)).toBe("text-foreground-muted");
  });

  // Positive spread = DeFi premium = expensive = red (negative/bad)
  it("returns negative (red) class for positive values (premium)", () => {
    expect(getValueColorClass(5)).toBe("text-chart-negative");
    expect(getValueColorClass(0.1)).toBe("text-chart-negative");
  });

  // Negative spread = DeFi discount = cheap = green (positive/good)
  it("returns positive (green) class for negative values (discount)", () => {
    expect(getValueColorClass(-5)).toBe("text-chart-positive");
    expect(getValueColorClass(-0.1)).toBe("text-chart-positive");
  });

  it("returns muted class for zero", () => {
    expect(getValueColorClass(0)).toBe("text-foreground-muted");
  });
});
