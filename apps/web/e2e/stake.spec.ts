import { test, expect } from "@playwright/test";

test("Stake JACK shows the rewards-variability notice and gates writes behind a wallet connection", async ({
  page,
}) => {
  await page.goto("/stake");

  await expect(page.getByRole("heading", { name: "Stake JACK, earn WETH" })).toBeVisible();
  await expect(page.getByText(/rewards are variable, may be zero/i)).toBeVisible();
  await expect(page.getByText(/connect your wallet to continue/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Stake" })).toHaveCount(0);
});

test("never shows an APY figure", async ({ page }) => {
  await page.goto("/stake");
  await expect(page.getByText(/\bAPY\b/i)).toHaveCount(0);
});
