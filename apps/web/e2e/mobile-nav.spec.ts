import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile navigation opens, lists every route, and navigates on tap", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByRole("button", { name: /open navigation menu/i });
  await expect(toggle).toBeVisible();

  await toggle.click();
  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNav).toBeVisible();

  for (const label of ["Home", "Save & Win", "Stake JACK", "JACK", "Draws", "Transparency", "How It Works"]) {
    await expect(mobileNav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }

  await mobileNav.getByRole("link", { name: "Stake JACK", exact: true }).click();
  await expect(page).toHaveURL(/\/stake$/);
});

test("mobile navigation closes on Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /open navigation menu/i }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
});

test("at 320px there is no horizontal scroll on the landing page", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});
