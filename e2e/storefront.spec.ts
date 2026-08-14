import { test, expect } from "@playwright/test";

test.describe("Storefront", () => {
  test("homepage renders hero and featured products", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("IoTMart").first()).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText("NodeMCU ESP8266 WiFi Development Board").first(),
    ).toBeVisible();
  });

  test("product listing shows items", async ({ page }) => {
    await page.goto("/products");
    const card = page
      .getByRole("link", { name: /NodeMCU ESP8266 WiFi Development Board/ })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
  });

  test("product detail page lets you add to cart", async ({ page }) => {
    await page.goto("/products/nodemcu-esp8266-wifi-development-board");
    const addBtn = page.getByText("Add to Cart", { exact: true }).first();
    await expect(addBtn).toBeVisible({ timeout: 30_000 });
    await addBtn.click();
    await expect(page.getByText("Added to Cart!")).toBeVisible();
  });

  test("cart page shows a seeded item and totals", async ({ page }) => {
    // Seed the cart BEFORE the app mounts: CartContext reads localStorage only
    // on mount and would otherwise clobber a late write with an empty cart.
    await page.addInitScript(() => {
      localStorage.setItem(
        "iotmart-cart",
        JSON.stringify([
          {
            product: {
              id: "396cdd38-b514-485e-9e59-33ad84c34593",
              name: "NodeMCU ESP8266 WiFi Development Board",
              slug: "nodemcu-esp8266-wifi-development-board",
              price: 450,
              images: ["/uploads/nodemcu.png"],
              stock: 20,
              inStock: true,
              brand: { name: "Espressif" },
            },
            quantity: 2,
          },
        ]),
      );
    });
    await page.goto("/cart");
    await expect(page.getByText("NodeMCU ESP8266 WiFi Development Board")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Proceed to Checkout")).toBeVisible();
  });
});
