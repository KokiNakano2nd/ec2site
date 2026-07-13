# 要求トレーサビリティマトリクス

## 1. 目的と判定基準

本書は要求から機能、外部設計、自動テストへの追跡可能性を示す。`直接検証`は主要な受け入れ条件を自動テストが直接確認、`部分検証`は正常系または一部条件のみ、`未検証`は対応する自動テストがない状態を表す。テストを通過するコードパスがあるだけでは直接検証と判定しない。

## 2. 機能別マトリクス

| 機能 | 上流要求 | 外部設計 | 主な自動テスト | 状態 | 未検証事項 |
|---|---|---|---|---|---|
| F-001 | US-001 | S-001/S-002; `POST /cart`, `GET /cart` | `test_cart_favorites_reviews.py`; `ProductDetail.test.jsx`, `CartView.test.jsx`; `purchase.spec.js` | 直接検証 | — |
| F-002 | US-001 | S-002; `PATCH/DELETE /cart/{cart_id}` | `test_cart_favorites_reviews.py`; `CartView.test.jsx` | 直接検証 | — |
| F-003 | UC-001 | S-002; `GET /coupons/validate` | `test_order_creation.py`; `CartView.test.jsx` | 部分検証 | 検証API固有の有効期限境界 |
| F-004 | US-003 | S-002; 注文・決済API | `test_order_creation.py`, `test_stripe_payment.py`; `CartView.test.jsx` | 直接検証 | 金額型をDecimal化した後の丸め境界 |
| F-005 | UC-002 | S-002/S-003; `GET /config`, `POST /payment/checkout` | `test_stripe_payment.py`; `CartView.test.jsx`; `purchase.spec.js` | 部分検証 | 実Stripe sandboxを使う契約テスト |
| F-006 | UC-002 | S-003/S-004; `POST /payment/complete` | `test_stripe_payment.py`; `OrderHistoryView.test.jsx` | 部分検証 | Webhook正経路と再送時の冪等性 |
| F-007 | US-005 | N-001 | `test_order_creation.py`, `test_stripe_payment.py` | 部分検証 | 実SMTP配送、再送、恒久失敗 |
| F-008 | UC-003 | S-002/S-004; `POST /orders` | `test_order_creation.py`; `CartView.test.jsx`; `purchase.spec.js` | 直接検証 | 同時購入時の在庫競合 |
| F-009 | US-006 | S-005; `POST /auth/register` | `test_auth.py`, `test_rate_limit.py`; `AuthView.test.jsx`; `auth.spec.js` | 直接検証 | — |
| F-010 | US-007 | S-005; `POST /auth/login`, `GET /auth/me` | `test_auth.py`, `test_rate_limit.py`; `AuthView.test.jsx`; `auth.spec.js` | 直接検証 | — |
| F-011 | US-008 | S-001/S-006; `POST/DELETE /favorites/{product_id}` | `test_cart_favorites_reviews.py`; `ProductDetail.test.jsx`, `FavoritesView.test.jsx`; `favorites.spec.js` | 直接検証 | — |
| F-012 | US-008 | S-006; `GET /favorites` | `test_cart_favorites_reviews.py`; `FavoritesView.test.jsx`; `favorites.spec.js` | 直接検証 | — |
| F-013 | UC-004 | S-001; `POST /products/{product_id}/reviews` | `test_cart_favorites_reviews.py`; `ProductDetail.test.jsx` | 直接検証 | — |
| F-014 | UC-004 | S-001; `GET /products/{product_id}/reviews` | `test_cart_favorites_reviews.py`; `ProductDetail.test.jsx` | 直接検証 | — |
| F-015 | US-010 | S-007; `POST /addresses` | `test_admin_and_addresses.py`; `ProfileView.test.jsx` | 直接検証 | — |
| F-016 | US-011 | S-007; `POST /addresses/{address_id}/default` | `test_admin_and_addresses.py`; `ProfileView.test.jsx` | 直接検証 | 他者IDに対する認可の明示テスト |
| F-017 | US-012 | S-007; `DELETE /addresses/{address_id}` | `test_admin_and_addresses.py`; `ProfileView.test.jsx` | 部分検証 | 他者IDに対する認可 |
| F-018 | US-032 | S-002/S-007; `GET /addresses` | `test_admin_and_addresses.py`; `ProfileView.test.jsx`, `CartView.test.jsx` | 部分検証 | 複数ユーザー分離と厳密な並び順 |
| F-019 | US-032 | S-007; `PATCH /addresses/{address_id}` | `test_admin_and_addresses.py`; `ProfileView.test.jsx` | 部分検証 | 他者IDに対する認可、デフォルト一意化 |
| F-020 | US-013 | S-101; `POST /admin/products` | `test_admin_and_addresses.py`; `AdminProductsView.test.jsx`; `admin.spec.js` | 直接検証 | — |
| F-021 | US-014 | S-101; `PATCH/DELETE /admin/products/{product_id}` | `test_admin_and_addresses.py`; `AdminProductsView.test.jsx`; `admin.spec.js` | 直接検証 | — |
| F-022 | US-015 | S-101; 商品画像管理API | `test_product_images.py`; `AdminProductsView.test.jsx` | 直接検証 | — |
| F-023 | US-016 | S-102; `POST /admin/coupons` | `test_admin_and_addresses.py`; `AdminCouponsView.test.jsx`; `admin.spec.js` | 直接検証 | — |
| F-024 | US-017 | S-102; `PATCH /admin/coupons/{coupon_id}` | `test_admin_and_addresses.py`; `AdminCouponsView.test.jsx` | 直接検証 | — |
| F-025 | US-017 | S-102; `DELETE /admin/coupons/{coupon_id}` | `test_admin_and_addresses.py`; `AdminCouponsView.test.jsx` | 直接検証 | — |
| F-026 | US-033 | S-102; `GET /admin/coupons` | `test_admin_and_addresses.py`, `test_stripe_payment.py`; `AdminCouponsView.test.jsx` | 部分検証 | 非管理者・未認証の一覧取得拒否 |
| F-027 | US-018 | S-103; `PATCH /admin/orders/{order_id}/status` | `test_admin_and_addresses.py`; `AdminOrdersView.test.jsx`; `admin.spec.js` | 直接検証 | 許可する状態遷移の業務ルール |
| F-028 | US-034 | S-103; `GET /admin/orders` | `test_auth.py`, `test_admin_and_addresses.py`; `AdminOrdersView.test.jsx` | 直接検証 | 未認証ケース |
| F-029 | US-019 | S-104; 売上分析4 API | `test_admin_analytics.py`; `AdminDashboardView.test.jsx`; `admin.spec.js` | 直接検証 | 大量データ時の性能 |
| F-030 | UC-005 | S-007; `DELETE /users/me` | `test_account_deletion.py`; `ProfileView.test.jsx` | 直接検証 | 保持期間経過後の物理削除 |
| F-031 | UC-006 | S-004; `POST /orders/{order_id}/cancel` | `test_order_cancel_return.py`; `OrderHistoryView.test.jsx` | 部分検証 | Stripe返金とDB更新の原子性・冪等性 |
| F-032 | UC-007 | S-004; `POST /orders/{order_id}/return-request` | `test_order_cancel_return.py`; `OrderHistoryView.test.jsx` | 直接検証 | — |
| F-033 | UC-008 | S-103; `PATCH /admin/orders/{order_id}/return` | `test_order_cancel_return.py`; `AdminOrdersView.test.jsx` | 部分検証 | Stripe返金とDB更新の原子性・冪等性 |
| F-034 | US-024 | S-101/S-104; `GET /admin/products/low-stock` | `test_admin_and_addresses.py`; `AdminProductsView.test.jsx`, `AdminDashboardView.test.jsx` | 直接検証 | — |
| F-035 | US-025 | S-102/S-104; `GET /admin/coupons/low-remaining-uses` | `test_admin_and_addresses.py`; `AdminCouponsView.test.jsx`, `AdminDashboardView.test.jsx` | 直接検証 | — |
| F-036 | UC-009 | S-005/S-008/S-009; パスワードリセット2 API | `test_password_reset.py`; `AuthView.test.jsx` | 部分検証 | トークンを平文保存しない方式への移行後検証 |
| F-037 | UC-010 | S-007; メール確認2 API | `test_email_verification.py`; `ProfileView.test.jsx` | 直接検証 | — |
| F-038 | US-028 | S-001; `GET /products?q=` | `ProductList.test.jsx`; 他backendテストのfixture取得 | 部分検証 | backendの検索・空結果・大小文字テスト |
| F-039 | US-028 | S-001; `GET /products/{product_id}` | `test_admin_and_addresses.py`; `ProductDetail.test.jsx` | 部分検証 | 正常系のbackend直接テスト |
| F-040 | US-029 | S-001; `GET /products/{product_id}/images` | `test_product_images.py`; `ProductDetail.test.jsx` | 直接検証 | — |
| F-041 | US-030 | S-001; `GET /products/{product_id}/recommendations` | `ProductDetail.test.jsx`(APIモック) | 部分検証 | backendのカテゴリ選択、最大4件、404 |
| F-042 | US-031 | S-004; `GET /orders`, `GET /orders/{order_id}` | `test_order_creation.py`, `test_order_cancel_return.py`; `OrderHistoryView.test.jsx` | 部分検証 | 他者の注文詳細を404とする直接テスト |

## 3. 検証ギャップ

優先度は金銭・認可・外部連携を先にする。

| 優先度 | 対象 | 対応方針 |
|---|---|---|
| P0 | F-006, F-031, F-033 | Stripe Webhookと冪等キーを設計後、重複イベント・途中失敗・再試行を結合テストする |
| P0 | F-016〜019, F-026, F-042 | 他ユーザー/一般ユーザー/未認証によるアクセス拒否を直接テストする |
| P1 | F-038, F-039, F-041 | 商品検索・詳細・関連商品のbackend APIテストを追加する |
| P1 | F-003 | クーポン有効期限・上限の境界値を検証API単体で追加する |
| P1 | F-005 | Stripe sandboxとの契約テストを手動/定期ジョブとして分離する |
| P2 | F-007 | SMTP配送失敗と再送戦略を決定してテストする |

## 4. 更新責任

機能追加・変更のPull Request作成者が本表を更新し、レビュー時に要求からテストまでのリンクを確認する。テスト計画の完了判定では、P0の`部分検証`を残さない。
