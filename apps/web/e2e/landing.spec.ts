import { test, expect } from "@playwright/test";

test("landing page renders the hero, CTAs, and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /someone wins/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open app" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore JACK", exact: true })).toBeVisible();
  await expect(page.getByText("Built for Robinhood Chain")).toBeVisible();
});

test("never renders the demo's mainnet-demo warning banner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/MAINNET DEMO/)).toHaveCount(0);
});

test("footer links to X, GitHub, and the risk statement", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: /x \/ twitter/i })).toHaveAttribute("href", "https://x.com/YieldJack");
  await expect(footer.getByText(/not affiliated with robinhood markets/i)).toBeVisible();
});

test("shows placeholders, never fabricated figures, before launch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Available at launch").first()).toBeVisible();
});
