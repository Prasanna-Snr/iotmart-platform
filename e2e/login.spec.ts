import { test, expect } from "@playwright/test";

const CUSTOMER_EMAIL = "e2e.customer@example.com";
const CUSTOMER_PASS = "E2ePass!2345";

test.describe("Customer login", () => {
  test("rejects invalid credentials with an error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", CUSTOMER_EMAIL);
    await page.fill("#password", "definitely-wrong");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.locator("form .bg-red-50")).toBeVisible({ timeout: 20_000 });
  });

  test("logs in and lands on the profile page with a session cookie", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", CUSTOMER_EMAIL);
    await page.fill("#password", CUSTOMER_PASS);
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL(/\/profile/, { timeout: 20_000 });
    const cookies = await page.context().cookies();
    const access = cookies.find((c) => c.name === "access_token");
    expect(access).toBeTruthy();
    const stored = await page.evaluate(() => localStorage.getItem("customer_user"));
    expect(stored).toContain(CUSTOMER_EMAIL);
  });

  test("logs out from the profile page", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", CUSTOMER_EMAIL);
    await page.fill("#password", CUSTOMER_PASS);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/profile/, { timeout: 20_000 });

    await page.getByText("Logout", { exact: true }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    const stored = await page.evaluate(() => localStorage.getItem("customer_user"));
    expect(stored).toBeNull();
  });
});
