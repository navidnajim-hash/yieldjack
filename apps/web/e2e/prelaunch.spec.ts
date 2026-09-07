import { test, expect } from "@playwright/test";

test("no transaction control is reachable anywhere while every production address is unconfigured", async ({
  page,
}) => {
  for (const route of ["/app", "/stake"]) {
    await page.goto(route);
    for (const label of ["Deposit", "Withdraw", "Claim", "Stake", "Unstake", "Claim WETH", "Approve JACK"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
    }
  }
});

test("essential pages render without configured production addresses", async ({ page }) => {
  for (const route of ["/", "/app", "/stake", "/jack", "/draws", "/transparency", "/how-it-works"]) {
    const response = await page.goto(route);
    expect(response?.ok(), `${route} did not respond OK`).toBe(true);
    await expect(page.locator("h1, h2").first()).toBeVisible();
  }
});
