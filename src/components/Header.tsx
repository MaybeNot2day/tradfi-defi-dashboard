import { formatRelativeTime } from "@/lib/format";

interface HeaderProps {
  lastUpdated?: string;
}

export function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">TradFi vs DeFi</h1>
          <p className="text-foreground-muted">
            Comparing flagship financial institutions with their decentralized counterparts
          </p>
        </div>
        {lastUpdated && (
          <div className="text-right text-sm">
            <p className="text-foreground-muted">Last updated</p>
            <p className="font-medium">{formatRelativeTime(lastUpdated)}</p>
          </div>
        )}
      </div>
    </header>
  );
}
