import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "320px mobile", width: 320, height: 700 },
  { name: "390px mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "1440px desktop", width: 1440, height: 1000 },
];

const ROUTES = ["/", "/app", "/stake", "/jack", "/draws", "/transparency", "/how-it-works"];

for (const viewport of VIEWPORTS) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`no horizontal overflow on ${route}`, async ({ page }) => {
        await page.goto(route);
        const hasOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(hasOverflow, `${route} overflows horizontally at ${viewport.width}px`).toBe(false);
      });
    }
  });
}
