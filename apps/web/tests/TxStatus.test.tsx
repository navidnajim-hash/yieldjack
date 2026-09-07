import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TxStatus } from "@/components/shared/TxStatus";

describe("TxStatus", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<TxStatus phase="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a signing prompt", () => {
    render(<TxStatus phase="signing" />);
    expect(screen.getByText(/Confirm the transaction/i)).toBeInTheDocument();
  });

  it("shows a confirming state", () => {
    render(<TxStatus phase="confirming" />);
    expect(screen.getByText(/Waiting for confirmation/i)).toBeInTheDocument();
  });

  it("shows a success state", () => {
    render(<TxStatus phase="success" />);
    expect(screen.getByText(/Confirmed/i)).toBeInTheDocument();
  });

  it("shows the error message on failure", () => {
    render(<TxStatus phase="error" errorMessage="Transaction rejected in wallet." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Transaction rejected in wallet.");
  });

  it("falls back to a generic error message when none is provided", () => {
    render(<TxStatus phase="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Transaction failed.");
  });
});
