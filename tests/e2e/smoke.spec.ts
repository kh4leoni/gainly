// Playwright E2E smoke suite.
// Run: `npx playwright test` (install via `npm i -D @playwright/test && npx playwright install`).
import { test, expect } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Gainly" })).toBeVisible();
});

test("client can sign up and reach dashboard", async ({ page }) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  await page.goto("/signup");
  await page.getByRole("button", { name: /client/i }).click();
  await page.getByLabel("Full name").fill("Test Client");
  await page.getByLabel("Email").fill(`client-${suffix}@example.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/client\/dashboard/);
});
