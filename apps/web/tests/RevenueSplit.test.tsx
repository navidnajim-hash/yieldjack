import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevenueSplit } from "@/components/shared/RevenueSplit";
import { REVENUE_SPLIT_CLARIFICATION } from "@/lib/constants";

describe("RevenueSplit", () => {
  it("renders the documented 70/20/10 split", () => {
    render(<RevenueSplit />);
    expect(screen.getByText("70.00%")).toBeInTheDocument();
    expect(screen.getByText("20.00%")).toBeInTheDocument();
    expect(screen.getByText("10.00%")).toBeInTheDocument();
  });

  it("clearly says creator-fee revenue, not gross trading volume", () => {
    render(<RevenueSplit />);
    expect(screen.getByText(new RegExp(REVENUE_SPLIT_CLARIFICATION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
    expect(screen.getByText(/creator-fee revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/not to gross trading volume/i)).toBeInTheDocument();
  });

  it("renders live values when provided instead of the documented defaults", () => {
    render(<RevenueSplit values={{ stakers: 6000, prizeReserve: 3000, operations: 1000 }} isLive />);
    expect(screen.getByText("60.00%")).toBeInTheDocument();
    expect(screen.getByText("30.00%")).toBeInTheDocument();
    expect(screen.getByText(/live values read from jackfeerouter/i)).toBeInTheDocument();
  });
});
