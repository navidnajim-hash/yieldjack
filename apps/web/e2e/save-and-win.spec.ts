import { test, expect } from "@playwright/test";

test("Save & Win prompts to connect a wallet, with no transactions possible pre-launch", async ({ page }) => {
  await page.goto("/app");

  await expect(page.getByRole("heading", { name: "Your position" })).toBeVisible();
  // No wallet is connected in this headless browser, so the shared NetworkGuard should gate the
  // whole dashboard behind a connect prompt rather than showing any transaction control.
  await expect(page.getByText(/connect your wallet to continue/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Deposit" })).toHaveCount(0);
});

test("never imports or renders anything from the demo deployment", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByText(/mock/i)).toHaveCount(0);
  await expect(page.getByText(/testnet/i)).toHaveCount(0);
});
