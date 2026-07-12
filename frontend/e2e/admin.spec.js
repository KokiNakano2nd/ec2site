import { test, expect } from "@playwright/test";

test("admin creates a product and views order management", async ({ page }) => {
  await page.goto("/");

  // Login as seeded admin
  await page.getByText("ログイン", { exact: true }).click();
  await page.getByPlaceholder("example@email.com").fill("admin@example.com");
  await page.getByPlaceholder("6文字以上").fill("admin12345");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByText("ログアウト")).toBeVisible();

  // Go to admin product management
  await page.getByText("商品管理").click();
  await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();

  // Create a new product
  const productName = `E2Eテスト商品-${Date.now()}`;
  await page.getByText("+ 新規商品を追加").click();
  await page.getByPlaceholder("商品名").fill(productName);
  await page.getByPlaceholder("商品の説明").fill("E2Eテスト用の商品説明");
  const priceInputs = page.getByPlaceholder("0");
  await priceInputs.nth(0).fill("1234");
  await priceInputs.nth(1).fill("5");
  await page.getByText("作成する").click();

  // Verify it appears in the admin product list
  await expect(page.getByText(productName)).toBeVisible();

  // Go to admin order management
  await page.getByText("注文管理").click();
  await expect(page.getByRole("heading", { name: "全注文一覧" })).toBeVisible();

  // Spec ordering isn't guaranteed, so only assert the page + status UI loads,
  // rather than depend on an order existing from another spec.
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();
  if (rowCount > 0) {
    await expect(rows.first().locator("select")).toBeVisible();
  } else {
    await expect(page.getByText("総注文数")).toBeVisible();
  }
});
