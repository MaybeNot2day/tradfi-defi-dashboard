interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-background-tertiary";

  const variantClasses = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-4 pb-4 border-b border-border">
        <Skeleton width={40} />
        <Skeleton width={150} />
        <Skeleton width={100} />
        <Skeleton width={80} />
        <Skeleton width={60} />
        <Skeleton width={100} />
        <Skeleton width={80} />
        <Skeleton width={60} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <Skeleton width={40} />
          <Skeleton width={150} />
          <Skeleton width={100} />
          <Skeleton width={80} />
          <Skeleton width={60} />
          <Skeleton width={100} />
          <Skeleton width={80} />
          <Skeleton width={60} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-3">
      <Skeleton width={100} height={16} />
      <Skeleton width={150} height={32} />
      <Skeleton width={80} height={14} />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-6">
      <Skeleton width={200} height={24} className="mb-4" />
      <Skeleton variant="rectangular" height={300} className="w-full" />
    </div>
  );
}
