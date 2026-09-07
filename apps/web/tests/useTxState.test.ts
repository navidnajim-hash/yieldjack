import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const writeContractAsync = vi.fn();
const resetWrite = vi.fn();
let mockHash: `0x${string}` | undefined;
let mockIsConfirming = false;
let mockIsConfirmed = false;

vi.mock("wagmi", () => ({
  useWriteContract: () => ({ writeContractAsync, data: mockHash, reset: resetWrite }),
  useWaitForTransactionReceipt: () => ({ isLoading: mockIsConfirming, isSuccess: mockIsConfirmed }),
}));

import { humanizeError, useTxState } from "@/hooks/useTxState";

describe("useTxState", () => {
  beforeEach(() => {
    writeContractAsync.mockReset();
    resetWrite.mockReset();
    mockHash = undefined;
    mockIsConfirming = false;
    mockIsConfirmed = false;
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useTxState());
    expect(result.current.phase).toBe("idle");
  });

  it("moves to signing then confirming on a successful send", async () => {
    writeContractAsync.mockResolvedValue("0xhash");
    mockHash = "0xhash";
    const { result } = renderHook(() => useTxState());

    await act(async () => {
      await result.current.send({ address: "0xabc", abi: [], functionName: "stake", args: [1n] });
    });

    expect(writeContractAsync).toHaveBeenCalledWith({ address: "0xabc", abi: [], functionName: "stake", args: [1n] });
    expect(result.current.phase).toBe("confirming");
  });

  it("reflects success once the receipt confirms", () => {
    mockHash = "0xhash";
    mockIsConfirmed = true;
    const { result } = renderHook(() => useTxState());
    expect(result.current.phase).toBe("success");
  });

  it("moves to error and captures a message when the wallet rejects", async () => {
    writeContractAsync.mockRejectedValue(new Error("User rejected the request."));
    const { result } = renderHook(() => useTxState());

    await act(async () => {
      await expect(
        result.current.send({ address: "0xabc", abi: [], functionName: "stake" }),
      ).rejects.toThrow();
    });

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.errorMessage).toBe("Transaction rejected in wallet.");
  });

  it("refuses to send a second transaction while one is already in flight", async () => {
    mockHash = "0xhash";
    mockIsConfirming = true; // simulates "confirming" phase
    const { result } = renderHook(() => useTxState());

    await act(async () => {
      await result.current.send({ address: "0xabc", abi: [], functionName: "stake" });
    });

    expect(writeContractAsync).not.toHaveBeenCalled();
  });

  it("reset returns to idle and clears the error", () => {
    const { result } = renderHook(() => useTxState());
    act(() => result.current.reset());
    expect(result.current.phase).toBe("idle");
    expect(result.current.errorMessage).toBeUndefined();
    expect(resetWrite).toHaveBeenCalled();
  });
});

describe("humanizeError", () => {
  it("maps a user-rejection error to a friendly message", () => {
    expect(humanizeError(new Error("User rejected the request"))).toBe("Transaction rejected in wallet.");
  });

  it("maps an insufficient-funds error", () => {
    expect(humanizeError(new Error("insufficient funds for gas"))).toBe("Insufficient funds for this transaction.");
  });

  it("maps an insufficient-allowance error", () => {
    expect(humanizeError(new Error("ERC20InsufficientAllowance(...)"))).toBe(
      "Approval required before this transaction can proceed.",
    );
  });

  it("falls back to the first line of an unknown error", () => {
    expect(humanizeError(new Error("Some unrelated revert reason\nwith extra data"))).toBe(
      "Some unrelated revert reason",
    );
  });

  it("falls back to a generic message for a non-Error value", () => {
    expect(humanizeError("not an error object")).toBe("Transaction failed.");
  });
});
