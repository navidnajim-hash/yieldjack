import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/home/Hero";
import { isPrelaunch } from "@/lib/production/resolver";

describe("no fake live figures while prelaunch", () => {
  it("the committed production manifest is genuinely prelaunch (sanity check for this test's premise)", () => {
    expect(isPrelaunch).toBe(true);
  });

  it("the home page hero shows placeholders, never invented numbers, before launch", () => {
    render(<Hero />);

    // Four preview metrics: current prize, round, deposit, JACK rewards — all "—" pre-launch.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Available at launch")).toBeInTheDocument();
    expect(screen.queryByText(/^\$[\d,]+/)).not.toBeInTheDocument();
  });
});
