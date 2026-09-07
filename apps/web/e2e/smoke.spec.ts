import { test, expect } from "@playwright/test";

test("landing page renders the hero and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Someone wins/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter YieldJack" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See How It Works" })).toBeVisible();

  const mainNav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(mainNav.getByRole("link", { name: "Draws" })).toBeVisible();
  await expect(mainNav.getByRole("link", { name: "Transparency" })).toBeVisible();
});

test("can navigate to How It Works and Transparency pages", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "See How It Works" }).click();
  await expect(page).toHaveURL(/how-it-works/);
  await expect(page.getByRole("heading", { name: /How YieldJack works/i })).toBeVisible();

  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Transparency" }).click();
  await expect(page).toHaveURL(/transparency/);
  await expect(page.getByText(/Not audited/i)).toBeVisible();
});
