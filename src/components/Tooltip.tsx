"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Safe hydration check using useSyncExternalStore
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const isMounted = useIsMounted();

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    // Estimate tooltip size (will be adjusted after render if needed)
    const tooltipHeight = 80;
    const tooltipWidth = 200;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = rect.top - tooltipHeight - 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 8;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 8;
        break;
    }

    // Keep tooltip within viewport
    if (typeof window !== "undefined") {
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
      top = Math.max(8, top);
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    calculatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const tooltip =
    isVisible && isMounted
      ? createPortal(
          <div
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] px-3 py-2 text-sm bg-background-tertiary border border-border rounded-lg shadow-lg animate-fade-in"
          >
            {content}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltip}
    </div>
  );
}

// Info icon SVG component
export function InfoIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Metric explanation tooltips
export const METRIC_TOOLTIPS = {
  pe_ratio: {
    title: "P/E Ratio (Price-to-Earnings)",
    description:
      "Measures value relative to earnings. For DeFi, uses protocol revenue (fees retained by protocol, not paid to LPs). Null if protocol has no revenue.",
    formula:
      "TradFi: FMP TTM P/E Ratio | DeFi: FDV ÷ Annualized Protocol Revenue",
  },
  ps_ratio: {
    title: "P/S Ratio (Price-to-Sales)",
    description:
      "Measures value relative to total fees paid by users (demand for the service).",
    formula: "TradFi: FMP TTM P/S Ratio | DeFi: FDV ÷ Annualized Total Fees",
  },
  equity_value: {
    title: "Equity Value",
    description: "Total valuation of the entity.",
    formula: "TradFi: Market Cap (FMP) | DeFi: Fully Diluted Valuation (CoinGecko)",
  },
  revenue: {
    title: "Revenue",
    description:
      "Income generated. For DeFi, this is protocol revenue only (after LP/validator distributions).",
    formula: "TradFi: TTM Revenue (FMP) | DeFi: 30d Revenue × 12 (DefiLlama)",
  },
  spread: {
    title: "P/E Spread",
    description:
      "Valuation gap between comparable TradFi and DeFi entities. Positive = DeFi premium, Negative = DeFi discount.",
    formula: "DeFi P/E − TradFi P/E",
  },
};

interface MetricTooltipProps {
  metric: keyof typeof METRIC_TOOLTIPS;
  children: React.ReactNode;
}

export function MetricTooltip({ metric, children }: MetricTooltipProps) {
  const info = METRIC_TOOLTIPS[metric];

  return (
    <Tooltip
      content={
        <div className="max-w-xs whitespace-normal">
          <p className="font-medium mb-1">{info.title}</p>
          <p className="text-foreground-muted text-xs mb-2">{info.description}</p>
          <p className="text-xs font-mono text-accent-defi">{info.formula}</p>
        </div>
      }
      position="top"
    >
      <span className="cursor-help border-b border-dotted border-foreground-muted">
        {children}
      </span>
    </Tooltip>
  );
}

/** Info icon with tooltip for metric explanations */
export function MetricInfoIcon({ metric }: { metric: keyof typeof METRIC_TOOLTIPS }) {
  const info = METRIC_TOOLTIPS[metric];

  return (
    <Tooltip
      content={
        <div className="w-64 whitespace-normal">
          <p className="font-medium text-foreground mb-1">{info.title}</p>
          <p className="text-foreground-muted text-xs mb-2">{info.description}</p>
          <p className="text-xs font-mono text-accent-defi break-words">{info.formula}</p>
        </div>
      }
      position="top"
    >
      <span className="cursor-help text-foreground-muted/60 hover:text-foreground-muted transition-colors ml-1 inline-flex">
        <InfoIcon className="w-3 h-3" />
      </span>
    </Tooltip>
  );
}
