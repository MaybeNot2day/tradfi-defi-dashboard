import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge variant="defi">DeFi</Badge>);
    expect(screen.getByText("DeFi")).toBeInTheDocument();
  });

  it("applies defi variant classes", () => {
    render(<Badge variant="defi">DeFi</Badge>);
    const badge = screen.getByText("DeFi");
    expect(badge).toHaveClass("badge-defi");
  });

  it("applies tradfi variant classes", () => {
    render(<Badge variant="tradfi">TradFi</Badge>);
    const badge = screen.getByText("TradFi");
    expect(badge).toHaveClass("badge-tradfi");
  });

  it("applies neutral variant classes", () => {
    render(<Badge variant="neutral">Neutral</Badge>);
    const badge = screen.getByText("Neutral");
    expect(badge).toHaveClass("bg-background-tertiary");
  });

  it("applies custom className", () => {
    render(
      <Badge variant="defi" className="custom-class">
        Test
      </Badge>
    );
    const badge = screen.getByText("Test");
    expect(badge).toHaveClass("custom-class");
  });
});
