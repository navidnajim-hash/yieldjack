import { test, expect } from "@playwright/test";

test("JACK page explains utility, shows the revenue split, and never confuses JACK with mJACK", async ({ page }) => {
  await page.goto("/jack");

  await expect(page.getByRole("heading", { name: "$JACK token" })).toBeVisible();
  await expect(page.getByText(/not launched yet/i)).toBeVisible();
  await expect(page.getByText("70.00%")).toBeVisible();
  await expect(page.getByText("20.00%")).toBeVisible();
  await expect(page.getByText("10.00%")).toBeVisible();
  await expect(page.getByText(/creator-fee revenue/i).first()).toBeVisible();
  await expect(page.getByText(/not to gross trading volume/i)).toBeVisible();
  await expect(page.getByText(/never.*confused with/i)).toBeVisible();
  await expect(page.locator("span.font-mono", { hasText: "mJACK" })).toBeVisible();
});

test("does not show a trade button before jackTradeUrl is configured", async ({ page }) => {
  await page.goto("/jack");
  await expect(page.getByRole("link", { name: "Trade JACK" })).toHaveCount(0);
});
