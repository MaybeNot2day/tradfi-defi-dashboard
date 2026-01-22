interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ label, value, subValue, trend, className = "" }: MetricCardProps) {
  const trendColors = {
    up: "text-chart-positive",
    down: "text-chart-negative",
    neutral: "text-foreground-muted",
  };

  return (
    <div className={`glass-card p-6 ${className}`}>
      <p className="text-foreground-muted text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {subValue && (
        <p className={`text-sm mt-1 ${trend ? trendColors[trend] : "text-foreground-muted"}`}>
          {subValue}
        </p>
      )}
    </div>
  );
}
