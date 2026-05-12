import { test, expect } from "@playwright/test";

test.describe("login screen", () => {
  test("unauthenticated user sees Sign in with Google", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
  });

  test("root redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
