/**
 * Formatting utilities for the dashboard.
 */

/**
 * Format a number as currency (USD).
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";

  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;

  return `$${value.toFixed(0)}`;
}

/**
 * Format a ratio value.
 */
export function formatRatio(value: number | null | undefined, decimals: number = 1): string {
  if (value == null) return "N/A";
  return value.toFixed(decimals);
}

/**
 * Format a percentage change.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

/**
 * Format a spread value with sign.
 */
export function formatSpread(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

/**
 * Format a date string.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(d);
}

/**
 * Get color class for spread values.
 * Negative spread (DeFi discount) = green (good value)
 * Positive spread (DeFi premium) = red (expensive)
 */
export function getValueColorClass(value: number | null | undefined): string {
  if (value == null) return "text-foreground-muted";
  if (value < 0) return "text-chart-positive"; // Discount = green
  if (value > 0) return "text-chart-negative"; // Premium = red
  return "text-foreground-muted";
}
