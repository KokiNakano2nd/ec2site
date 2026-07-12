import { test, expect } from "@playwright/test";

test("search, add to cart, apply coupon, place order, and cancel it", async ({ page }) => {
  const email = `e2e-purchase-${Date.now()}@example.com`;
  const password = "password123";

  await page.goto("/");

  // Register + auto-login
  await page.getByText("新規登録", { exact: true }).click();
  await page.getByPlaceholder("example@email.com").fill(email);
  await page.getByPlaceholder("6文字以上").fill(password);
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page.getByText("ログアウト")).toBeVisible();

  // Search products
  await page.getByPlaceholder("商品名・説明で検索...").fill("イヤホン");
  const productCard = page.locator(".product-card").first();
  await expect(productCard).toBeVisible();
  await productCard.click();

  // Product detail: add to cart
  await expect(page.getByRole("button", { name: "カートに入れる" })).toBeVisible();
  await page.getByRole("button", { name: "カートに入れる" }).click();
  await expect(page.getByText("カートに追加しました").first()).toBeVisible();

  // Go to cart
  await page.getByText("🛒 カート").click();
  await expect(page.getByText("ショッピングカート")).toBeVisible();

  // Change quantity
  await page.locator(".qty-btn-sm", { hasText: "+" }).click();

  // Apply coupon
  await page.getByPlaceholder("コードを入力").fill("WELCOME10");
  await page.getByText("適用", { exact: true }).click();
  await expect(page.getByText(/WELCOME10/)).toBeVisible();
  await expect(page.getByText("割引")).toBeVisible();

  // Place order
  await page.getByText("注文を確定する →").click();
  await expect(page.getByText("ご注文ありがとうございます！")).toBeVisible();

  // Verify order appears in order history
  await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible();
  const orderCard = page.getByText(/注文 #\d+/).first();
  await expect(orderCard).toBeVisible();

  // Cancel the order
  await page.getByText("キャンセルする").first().click();
  await expect(page.getByText("キャンセル済み").first()).toBeVisible();
});
