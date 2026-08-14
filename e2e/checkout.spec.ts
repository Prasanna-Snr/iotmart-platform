import { test, expect } from "@playwright/test";

const CUSTOMER_EMAIL = "e2e.customer@example.com";
const CUSTOMER_PASS = "E2ePass!2345";

test.describe("Checkout (cart → order → confirmation)", () => {
  test("places a COD order and shows the order number", async ({ page }) => {
    // 1. Log in
    await page.goto("/login");
    await page.fill("#email", CUSTOMER_EMAIL);
    await page.fill("#password", CUSTOMER_PASS);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL(/\/profile/, { timeout: 20_000 });

    // 2. Add a real product to the cart
    await page.goto("/products/nodemcu-esp8266-wifi-development-board");
    const addBtn = page.getByText("Add to Cart", { exact: true }).first();
    await expect(addBtn).toBeVisible({ timeout: 30_000 });
    await addBtn.click();
    await expect(page.getByText("Added to Cart!")).toBeVisible();

    // 3. Go to cart and continue to checkout
    await page.goto("/cart");
    await page.getByRole("link", { name: /Proceed to Checkout/ }).click();
    await page.waitForURL(/\/checkout/, { timeout: 20_000 });

    // 4. Shipping step
    await page.fill("#first-name", "E2E");
    await page.fill("#last-name", "Customer");
    await page.fill("#phone", "5550100");
    await page.fill("#address", "1 Test Lane");
    await page.fill("#city", "Accra");
    await page.getByRole("textbox", { name: /State \/ Province/ }).fill("Greater Accra");
    await page.getByRole("button", { name: "Continue to Payment" }).click();

    // 5. Review & place order (COD)
    await expect(page.getByText("Review & Place Order")).toBeVisible();
    await page.getByRole("button", { name: /Place Order/ }).click();

    // 6. Confirmation
    await expect(page.getByText("Order Placed!")).toBeVisible({ timeout: 30_000 });
    const orderNumber = await page
      .locator("strong")
      .filter({ hasText: /ORD-/ })
      .textContent();
    expect(orderNumber).toMatch(/ORD-/);
    console.log(`Created order ${orderNumber?.trim()}`);
  });
});
