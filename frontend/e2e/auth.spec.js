import { test, expect } from "@playwright/test";

test("@smoke register, logout, and login again", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "password123";

  await page.goto("/");

  // Register
  await page.getByText("新規登録", { exact: true }).click();
  await page.getByPlaceholder("example@email.com").fill(email);
  await page.getByPlaceholder("6文字以上").fill(password);
  await page.getByRole("button", { name: "アカウントを作成" }).click();

  // Logged in: header shows logout button and product list
  await expect(page.getByText("ログアウト")).toBeVisible();
  await expect(page.getByText("ガジェット & 電子機器")).toBeVisible();

  // Logout
  await page.getByText("ログアウト").click();
  await expect(page.getByText("ログイン", { exact: true })).toBeVisible();

  // Login again with same credentials
  await page.getByText("ログイン", { exact: true }).click();
  await page.getByPlaceholder("example@email.com").fill(email);
  await page.getByPlaceholder("6文字以上").fill(password);
  await page.locator("form button[type=submit]").click();

  await expect(page.getByText("ログアウト")).toBeVisible();

  // Logout again
  await page.getByText("ログアウト").click();
  await expect(page.getByText("新規登録", { exact: true })).toBeVisible();
});
