# API仕様

記載ルールは `docs/templates/external_design/api_spec_template.md` を参照。

個別のエンドポイント仕様は`api_spec/`配下のファイルへ分離した(1エンドポイント=1ファイル)。本ファイルは一覧とリンク集を提供する。

| 業務領域 | リソース | メソッド | パス | 概要 | 詳細 |
|---|---|---|---|---|---|
| 商品購入業務 | /products | GET | `/products` | 商品一覧を取得する | [products__get.md](api_spec/products__get.md) |
| 商品購入業務 | /products | GET | `/products/{product_id}` | 商品詳細を取得する | [products_product_id__get.md](api_spec/products_product_id__get.md) |
| 商品購入業務 | /cart | GET | `/cart` | カート内商品一覧を取得する | [cart__get.md](api_spec/cart__get.md) |
| 商品購入業務 | /cart | POST | `/cart` | カートに商品を追加する | [cart__post.md](api_spec/cart__post.md) |
| 商品購入業務 | /cart | PATCH | `/cart/{cart_id}` | カート内商品の数量を変更する | [cart_cart_id__patch.md](api_spec/cart_cart_id__patch.md) |
| 商品購入業務 | /cart | DELETE | `/cart/{cart_id}` | カートから商品を削除する | [cart_cart_id__delete.md](api_spec/cart_cart_id__delete.md) |
| 商品購入業務 | /coupons | GET | `/coupons/validate` | クーポンコードを検証する | [coupons_validate__get.md](api_spec/coupons_validate__get.md) |
| 商品購入業務 | /orders | POST | `/orders` | カード決済を使わずに注文を確定する | [orders__post.md](api_spec/orders__post.md) |
| 商品購入業務 | /orders | GET | `/orders` | 注文履歴を取得する | [orders__get.md](api_spec/orders__get.md) |
| 商品購入業務 | /orders | POST | `/orders/{order_id}/cancel` | 注文をキャンセルする | [orders_order_id_cancel__post.md](api_spec/orders_order_id_cancel__post.md) |
| 商品購入業務 | /orders | POST | `/orders/{order_id}/return-request` | 返品を申請する | [orders_order_id_return_request__post.md](api_spec/orders_order_id_return_request__post.md) |
| 商品購入業務 | /payment | GET | `/config` | システム設定を取得する | [config__get.md](api_spec/config__get.md) |
| 商品購入業務 | /payment | POST | `/payment/checkout` | Stripe決済セッションを作成する | [payment_checkout__post.md](api_spec/payment_checkout__post.md) |
| 商品購入業務 | /payment | POST | `/payment/complete` | Stripe決済完了処理を行う | [payment_complete__post.md](api_spec/payment_complete__post.md) |
| 商品購入業務 | /addresses(商品購入業務からの参照) | GET | `/addresses` | 配送先一覧を取得する | [addresses__get.md](api_spec/addresses__get.md) |
| 会員管理業務 | /auth | POST | `/auth/register` | 会員登録する | [auth_register__post.md](api_spec/auth_register__post.md) |
| 会員管理業務 | /auth | POST | `/auth/login` | ログインする | [auth_login__post.md](api_spec/auth_login__post.md) |
| 会員管理業務 | /auth | GET | `/auth/me` | 現在のユーザー情報を取得する | [auth_me__get.md](api_spec/auth_me__get.md) |
| 会員管理業務 | /users | DELETE | `/users/me` | 退会する(論理削除+個人情報の匿名化) | [users_me__delete.md](api_spec/users_me__delete.md) |
| 会員管理業務 | /auth | POST | `/auth/password-reset/request` | パスワードリセットを要求する | [auth_password_reset_request__post.md](api_spec/auth_password_reset_request__post.md) |
| 会員管理業務 | /auth | POST | `/auth/password-reset/confirm` | パスワードを再設定する | [auth_password_reset_confirm__post.md](api_spec/auth_password_reset_confirm__post.md) |
| 会員管理業務 | /auth | POST | `/auth/verify-email/resend` | 確認メールを再送する | [auth_verify_email_resend__post.md](api_spec/auth_verify_email_resend__post.md) |
| 会員管理業務 | /auth | POST | `/auth/verify-email/confirm` | メールアドレスを確認する | [auth_verify_email_confirm__post.md](api_spec/auth_verify_email_confirm__post.md) |
| お気に入り管理業務 | /favorites | GET | `/favorites` | お気に入り一覧を取得する | [favorites__get.md](api_spec/favorites__get.md) |
| お気に入り管理業務 | /favorites | POST | `/favorites/{product_id}` | お気に入りに登録する | [favorites_product_id__post.md](api_spec/favorites_product_id__post.md) |
| お気に入り管理業務 | /favorites | DELETE | `/favorites/{product_id}` | お気に入りを解除する | [favorites_product_id__delete.md](api_spec/favorites_product_id__delete.md) |
| レビュー投稿業務 | /products/{product_id}/reviews | GET | `/products/{product_id}/reviews` | レビュー一覧を取得する | [products_product_id_reviews__get.md](api_spec/products_product_id_reviews__get.md) |
| レビュー投稿業務 | /products/{product_id}/reviews | POST | `/products/{product_id}/reviews` | レビューを投稿する | [products_product_id_reviews__post.md](api_spec/products_product_id_reviews__post.md) |
| 配送先管理業務 | /addresses | POST | `/addresses` | 配送先を登録する | [addresses__post.md](api_spec/addresses__post.md) |
| 配送先管理業務 | /addresses | PATCH | `/addresses/{address_id}` | 配送先を編集する | [addresses_address_id__patch.md](api_spec/addresses_address_id__patch.md) |
| 配送先管理業務 | /addresses | DELETE | `/addresses/{address_id}` | 配送先を削除する | [addresses_address_id__delete.md](api_spec/addresses_address_id__delete.md) |
| 配送先管理業務 | /addresses | POST | `/addresses/{address_id}/default` | デフォルト配送先を設定する | [addresses_address_id_default__post.md](api_spec/addresses_address_id_default__post.md) |
| 商品管理業務(管理者向け) | /admin/products | POST | `/admin/products` | 商品を登録する | [admin_products__post.md](api_spec/admin_products__post.md) |
| 商品管理業務(管理者向け) | /admin/products | PATCH | `/admin/products/{product_id}` | 商品を編集する | [admin_products_product_id__patch.md](api_spec/admin_products_product_id__patch.md) |
| 商品管理業務(管理者向け) | /admin/products | DELETE | `/admin/products/{product_id}` | 商品を削除する | [admin_products_product_id__delete.md](api_spec/admin_products_product_id__delete.md) |
| 商品管理業務(管理者向け) | /admin/products/{product_id}/images, /admin/product-images | POST | `/admin/products/{product_id}/images` | 商品画像を追加する | [admin_products_product_id_images__post.md](api_spec/admin_products_product_id_images__post.md) |
| 商品管理業務(管理者向け) | /admin/products/{product_id}/images, /admin/product-images | PATCH | `/admin/product-images/{image_id}` | 商品画像を編集する | [admin_product_images_image_id__patch.md](api_spec/admin_product_images_image_id__patch.md) |
| 商品管理業務(管理者向け) | /admin/products/{product_id}/images, /admin/product-images | DELETE | `/admin/product-images/{image_id}` | 商品画像を削除する | [admin_product_images_image_id__delete.md](api_spec/admin_product_images_image_id__delete.md) |
| 商品管理業務(管理者向け) | /admin/products/low-stock | GET | `/admin/products/low-stock` | 低在庫の商品一覧を取得する | [admin_products_low_stock__get.md](api_spec/admin_products_low_stock__get.md) |
| クーポン管理業務(管理者向け) | /admin/coupons/low-remaining-uses | GET | `/admin/coupons/low-remaining-uses` | 残数僅少のクーポン一覧を取得する | [admin_coupons_low_remaining_uses__get.md](api_spec/admin_coupons_low_remaining_uses__get.md) |
| クーポン管理業務(管理者向け) | /admin/coupons | GET | `/admin/coupons` | クーポン一覧を取得する | [admin_coupons__get.md](api_spec/admin_coupons__get.md) |
| クーポン管理業務(管理者向け) | /admin/coupons | POST | `/admin/coupons` | クーポンを発行する | [admin_coupons__post.md](api_spec/admin_coupons__post.md) |
| クーポン管理業務(管理者向け) | /admin/coupons | PATCH | `/admin/coupons/{coupon_id}` | クーポンの有効/無効を切り替える | [admin_coupons_coupon_id__patch.md](api_spec/admin_coupons_coupon_id__patch.md) |
| クーポン管理業務(管理者向け) | /admin/coupons | DELETE | `/admin/coupons/{coupon_id}` | クーポンを削除する | [admin_coupons_coupon_id__delete.md](api_spec/admin_coupons_coupon_id__delete.md) |
| 注文管理業務(管理者向け) | /admin/orders | GET | `/admin/orders` | 全顧客の注文一覧を取得する | [admin_orders__get.md](api_spec/admin_orders__get.md) |
| 注文管理業務(管理者向け) | /admin/orders | PATCH | `/admin/orders/{order_id}/status` | 注文ステータスを更新する | [admin_orders_order_id_status__patch.md](api_spec/admin_orders_order_id_status__patch.md) |
| 注文管理業務(管理者向け) | /admin/orders | PATCH | `/admin/orders/{order_id}/return` | 返品を承認・却下する | [admin_orders_order_id_return__patch.md](api_spec/admin_orders_order_id_return__patch.md) |
| 売上分析業務(管理者向け) | /admin/analytics | GET | `/admin/analytics/summary` | 売上サマリーを取得する | [admin_analytics_summary__get.md](api_spec/admin_analytics_summary__get.md) |
| 売上分析業務(管理者向け) | /admin/analytics | GET | `/admin/analytics/sales-by-date` | 日別売上推移を取得する | [admin_analytics_sales_by_date__get.md](api_spec/admin_analytics_sales_by_date__get.md) |
| 売上分析業務(管理者向け) | /admin/analytics | GET | `/admin/analytics/top-products` | 売れ筋商品を取得する | [admin_analytics_top_products__get.md](api_spec/admin_analytics_top_products__get.md) |
| 売上分析業務(管理者向け) | /admin/analytics | GET | `/admin/analytics/category-sales` | カテゴリ別売上を取得する | [admin_analytics_category_sales__get.md](api_spec/admin_analytics_category_sales__get.md) |
