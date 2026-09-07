import { test, expect } from "@playwright/test";

test("Transparency page shows pending deployment status and an honest audit status", async ({ page }) => {
  await page.goto("/transparency");

  await expect(page.getByRole("heading", { name: /everything yieldjack runs on/i })).toBeVisible();
  await expect(page.getByText("Deployment status: prelaunch")).toBeVisible();
  await expect(page.getByText("Pending deployment").first()).toBeVisible();
  await expect(page.getByText("Independent audit pending")).toBeVisible();
  await expect(page.getByRole("link", { name: /view source on github/i })).toHaveAttribute(
    "href",
    "https://github.com/navidnajim-hash/yieldjack",
  );
});

test("never shows a fabricated contract address", async ({ page }) => {
  await page.goto("/transparency");
  // No 0x-prefixed 40-hex-char address should appear anywhere while every contract is null.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(/0x[0-9a-fA-F]{40}/);
});
