interface BadgeProps {
  variant: "tradfi" | "defi" | "neutral";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  const baseClasses = "px-2 py-0.5 rounded text-xs font-medium inline-flex items-center";

  const variantClasses = {
    tradfi: "badge-tradfi",
    defi: "badge-defi",
    neutral: "bg-background-tertiary text-foreground-muted border border-border",
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
