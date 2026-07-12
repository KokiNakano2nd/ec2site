import { test, expect } from "@playwright/test";

test("favorite a product, see it in favorites, then un-favorite it", async ({ page }) => {
  const email = `e2e-fav-${Date.now()}@example.com`;
  const password = "password123";

  await page.goto("/");

  // Register + auto-login
  await page.getByText("新規登録", { exact: true }).click();
  await page.getByPlaceholder("example@email.com").fill(email);
  await page.getByPlaceholder("6文字以上").fill(password);
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page.getByText("ログアウト")).toBeVisible();

  // Favorite the first product from the list
  const firstCard = page.locator(".product-card").first();
  await expect(firstCard).toBeVisible();
  const productName = await firstCard.locator("h3").innerText();
  await firstCard.getByText("🤍").click();

  // Go to favorites view
  await page.getByText("♡ お気に入り").click();
  await expect(page.getByRole("heading", { name: "お気に入り" })).toBeVisible();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  // Un-favorite it
  await page.getByText("❤️").click();
  await expect(page.getByText("お気に入りに追加した商品はありません")).toBeVisible();
});
