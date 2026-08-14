import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "e2e.admin@example.com";
const ADMIN_PASS = "E2ePass!2345";

test.describe("Admin panel", () => {
  test("shows the login modal and rejects a wrong password", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Admin Login")).toBeVisible({ timeout: 20_000 });
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.locator("form .bg-red-50")).toBeVisible({ timeout: 20_000 });
  });

  test("admin logs in and the dashboard renders stats", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Admin Login")).toBeVisible({ timeout: 20_000 });
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Dashboard loads the stats cards + recent orders
    await expect(page.getByText(/Total Revenue/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Recent Orders/i)).toBeVisible({ timeout: 30_000 });
    const stored = await page.evaluate(() => localStorage.getItem("admin_user"));
    expect(stored).toContain(ADMIN_EMAIL);
  });

  test("admin can navigate to the orders panel", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Admin Login")).toBeVisible({ timeout: 20_000 });
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASS);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(/Total Revenue/i)).toBeVisible({ timeout: 30_000 });

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 30_000,
    });
  });
});
