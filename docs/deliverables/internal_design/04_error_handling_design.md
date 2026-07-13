# 内部エラー・例外・トランザクション設計書

テンプレート: [[../../templates/internal_design/error_handling_design_template|docs/templates/internal_design/error_handling_design_template.md]]

## 1. 目的と正本

本書は、APIで発生する業務エラーの発生箇所、DBトランザクション境界、Stripe・SMTPとの整合性、ログ方針を定義する。HTTPインターフェースの機械可読な正本は[OpenAPI](../external_design/openapi.json)、業務上の補足は[API仕様一覧](../external_design/02_api_spec.md)とする。

ソース位置は、リファクタリングで壊れやすい行番号ではなく`モジュール.関数名`で示す。`ERR-*`は本書内の安定した追跡IDであり、現行APIレスポンスには含まれない。

## 2. 共通エラー

| エラーID | 発生箇所 | HTTP | 条件 | レスポンス`detail` | ログ |
|---|---|---:|---|---|---|
| ERR-COMMON-401 | `auth.get_current_user` | 401 | トークンなし・不正・期限切れ、対象ユーザーなし、退会済み | 認証情報が無効です | なし |
| ERR-COMMON-403 | `auth.get_current_admin` | 403 | 認証済みだが管理者でない | 管理者権限が必要です | なし |
| ERR-COMMON-422 | FastAPI/Pydantic | 422 | パス・クエリ・ボディの型、必須性、形式が不正 | FastAPI標準の検証エラー | なし |
| ERR-COMMON-500 | 各エンドポイント | 500 | 捕捉していないDB・プログラム例外 | FastAPI標準のInternal Server Error | ASGIサーバー側に委ねる |

## 3. 業務エラー

### 3.1 商品・カート・クーポン

| エラーID | 発生箇所 | HTTP | 条件 | `detail` |
|---|---|---:|---|---|
| ERR-PRODUCT-404 | `routers.products.get_product`, `get_recommendations` | 404 | 商品なし | Product not found |
| ERR-PRODUCT-404-JA | `routers.products.create_review`, `list_product_images` | 404 | 商品なし | 商品が見つかりません |
| ERR-REVIEW-RATING | `routers.products.create_review` | 400 | 評価が1〜5以外 | 評価は1〜5で指定してください |
| ERR-REVIEW-DUPLICATE | `routers.products.create_review` | 400 | 同一顧客が同一商品へ投稿済み | すでにレビューを投稿済みです |
| ERR-CART-PRODUCT | `routers.cart.add_cart_item` | 404 | 商品なし | 商品が見つかりません |
| ERR-CART-STOCK | `routers.cart.add_cart_item`, `update_cart_item` | 400 | 指定数量が在庫超過 | 在庫数を超える数量は指定できません |
| ERR-CART-NOT-FOUND | `routers.cart.update_cart_item`, `delete_cart_item` | 404 | カート行なし、または他顧客の行 | カート内に該当の商品が見つかりません |
| ERR-CART-QUANTITY | `routers.cart.update_cart_item` | 400 | 数量が1未満 | 数量は1以上を指定してください |
| ERR-COUPON-INVALID | `routers.coupons.validate_coupon`, `routers.orders.create_order` | 404/400 | 有効なコードなし | 無効なクーポンコードです |
| ERR-COUPON-LIMIT | 同上 | 400 | 使用回数上限到達 | このクーポンは使用回数の上限に達しています |

`ERR-COUPON-INVALID`は検証APIでは404、注文確定APIでは400となる。意図的な使い分けとして確定されていないため、APIエラー形式の標準化時に統一要否を判断する。

### 3.2 注文・決済・返品

| エラーID | 発生箇所 | HTTP | 条件 | `detail` | ログ |
|---|---|---:|---|---|---|
| ERR-ORDER-EMPTY | `routers.orders.create_order`, `routers.payment.create_checkout_session` | 400 | カートが空 | カートが空です | なし |
| ERR-ORDER-STOCK | `routers.orders.create_order` | 400 | 注文時点で在庫不足 | `{商品名}の在庫数が不足しています` | なし |
| ERR-ORDER-NOT-FOUND | `routers.orders.get_order`, `cancel_order`, `request_order_return` | 404 | 注文なし、または他顧客の注文 | 注文が見つかりません | なし |
| ERR-ORDER-CANCEL-STATE | `routers.orders.cancel_order` | 400 | `pending`/`processing`以外 | 発送済みの注文はキャンセルできません | なし |
| ERR-ORDER-RETURN-STATE | `routers.orders.request_order_return` | 400 | `shipped`以外 | この注文は返品を申請できません | なし |
| ERR-PAYMENT-DISABLED | `routers.payment.create_checkout_session`, `complete_payment` | 400 | Stripeキー未設定 | Stripeが設定されていません | なし |
| ERR-PAYMENT-CREATE | `routers.payment.create_checkout_session` | 500 | Checkout Session作成失敗 | `Stripe エラー: {例外文字列}` | ERROR |
| ERR-PAYMENT-RETRIEVE | `routers.payment.complete_payment` | 400 | Session取得失敗 | `セッション取得失敗: {例外文字列}` | ERROR |
| ERR-PAYMENT-UNPAID | `routers.payment.complete_payment` | 400 | `payment_status != paid` | 支払いが完了していません | なし |
| ERR-PAYMENT-OWNER | `routers.payment.complete_payment` | 403 | Sessionの顧客とログイン顧客が不一致 | アクセス権限がありません | WARNING |
| ERR-PAYMENT-CART-CONSUMED | `routers.payment.complete_payment` | 400 | 決済後にカートが空 | カートが空です（既に注文済みかもしれません） | なし |
| ERR-REFUND-FAILED | `services.order_actions.reverse_order` | 500 | Stripe返金失敗 | 返金処理に失敗しました | ERROR |
| ERR-ADMIN-RETURN-ACTION | `routers.admin_orders.admin_resolve_return` | 400 | actionがapprove/reject以外 | actionはapproveまたはrejectを指定してください | なし |
| ERR-ADMIN-ORDER-NOT-FOUND | `routers.admin_orders.admin_resolve_return`, `admin_update_order_status` | 404 | 注文なし | 注文が見つかりません | なし |
| ERR-ADMIN-RETURN-STATE | `routers.admin_orders.admin_resolve_return` | 400 | `return_requested`以外 | この注文は返品申請中ではありません | なし |

Stripe SDKの例外文字列をクライアントへ返している箇所は、内部情報を露出する可能性がある。外部向けには固定メッセージと追跡IDのみを返し、詳細をログへ限定する方式へ移行する。

### 3.3 会員・配送先・管理機能

| エラーID | 発生箇所 | HTTP | 条件 | `detail` |
|---|---|---:|---|---|
| ERR-AUTH-RATE | `routers.users.register`, `login` | 429 | IP単位の制限超過 | リクエストが多すぎます。しばらくしてから再度お試しください |
| ERR-AUTH-DUPLICATE | `routers.users.register` | 400 | メールアドレス登録済み | このメールアドレスは既に登録されています |
| ERR-AUTH-CREDENTIALS | `routers.users.login` | 401 | メールアドレスなし、またはパスワード不一致 | メールアドレスまたはパスワードが正しくありません |
| ERR-ACCOUNT-PASSWORD | `routers.users.delete_account` | 403 | 退会確認パスワード不一致 | パスワードが正しくありません |
| ERR-TOKEN-INVALID | `routers.users.confirm_password_reset`, `confirm_email_verification` | 400 | トークンなし・不正・期限切れ | リンクが無効です。再度お手続きください |
| ERR-ADDRESS-NOT-FOUND | `routers.addresses.update_address`, `delete_address`, `set_default_address` | 404 | 配送先なし、または他顧客の配送先 | 住所が見つかりません |
| ERR-ADMIN-PRODUCT | `routers.admin_products.admin_update_product`, `admin_delete_product`, `admin_add_product_image` | 404 | 商品なし | 商品が見つかりません |
| ERR-ADMIN-IMAGE | `routers.admin_products.admin_update_product_image`, `admin_delete_product_image` | 404 | 画像なし | 画像が見つかりません |
| ERR-ADMIN-COUPON-TYPE | `routers.admin_coupons.admin_create_coupon` | 400 | 割引種別がpercentage/fixed以外 | discount_typeは percentage または fixed を指定してください |
| ERR-ADMIN-COUPON-DUPLICATE | `routers.admin_coupons.admin_create_coupon` | 400 | コード重複 | このクーポンコードはすでに存在します |
| ERR-ADMIN-COUPON | `routers.admin_coupons.admin_toggle_coupon`, `admin_delete_coupon` | 404 | クーポンなし | クーポンが見つかりません |

## 4. DBトランザクション境界

| 処理 | DB更新単位 | commitの位置 | commit前エラー | commit後エラー |
|---|---|---|---|---|
| 通常CRUD | 1 HTTPリクエスト | 各ルーター関数内 | 更新は確定しない。明示的`rollback()`はなくSession close時の破棄に依存 | 原則なし |
| 注文確定 | 注文、明細、在庫減算、クーポン回数加算、カート削除 | `services.order_actions.fulfill_order`で一括commit | DB内は同一トランザクション | 注文確認メール失敗はDBを戻さない |
| 注文キャンセル/返品承認 | 在庫復元、クーポン回数減算、注文状態更新 | `reverse_order`の呼び出し元でcommit | Stripe返金失敗時はDBを変更しない | Stripe返金成功後にDB commitが失敗すると外部とDBが不整合 |
| 返品申請/状態更新 | 注文状態・返品理由 | 各ルーターでcommit | 更新は確定しない | 通知メール失敗はDBを戻さない |
| 退会 | 配送先/お気に入り削除、ユーザー匿名化・無効化 | `routers.users.delete_account`で一括commit | DB内は同一トランザクション | 退会メールはcommit前送信のため、DB失敗でも完了メールが届く可能性あり |
| 登録・リセット・メール確認 | ユーザーとトークン更新 | 各ルーターでcommit | 更新は確定しない | メール失敗はDBを戻さない |

DB更新を行うサービスは原則commitせず、ユースケース境界のルーターがcommit/rollbackを所有する形を移行目標とする。現行`fulfill_order`はサービス内commitを行う例外である。

## 5. 外部副作用・冪等性・競合

| リスクID | 現状 | 影響 | 必要な対策 |
|---|---|---|---|
| RISK-TX-001 | 決済確定をブラウザの`POST /payment/complete`に依存 | 支払済みだが注文未作成 | Stripe Webhookを正経路にし、署名検証・再試行を設計する |
| RISK-TX-002 | `payment/complete`に冪等性キー・決済IDの一意制約なし | 同時/再送で重複注文の可能性 | PaymentIntent IDのUNIQUE化と冪等なupsert/重複応答 |
| RISK-TX-003 | 返金API成功後にDB commit | 返金済みだが注文状態・在庫が未更新 | 操作記録、冪等性キー、再実行可能な補償処理 |
| RISK-TX-004 | 在庫・クーポン回数をread-modify-writeし、ロックなし | 同時注文による過販売・上限超過・lost update | 条件付きUPDATE、行ロックまたは楽観ロック、DB制約 |
| RISK-TX-005 | DB commit後のメールを同期送信し、永続キューなし | 通知欠落を自動再送できない | transactional outboxまたは永続ジョブキュー |
| RISK-TX-006 | 通常CRUDで明示的rollbackなし | 例外処理の意図が不明確 | ユースケース単位の`with db.begin()`または共通rollback境界 |
| RISK-TX-007 | 無効クーポンを`POST /orders`は400、Stripe経路は割引なしで続行 | 同じ入力でも決済経路により金額・利用者認識が異なる | クーポン検証を共通serviceへ集約し、失敗規則を要求として統一する |
| RISK-TX-008 | carts/favorites/reviewsの業務上一意な組合せにDB制約なし | 並行要求で重複行が作られる | 複合UNIQUE制約を追加し、競合時の応答を定義する |

これらは「現状仕様」として受容済みではなく、本番運用前に解消または残存リスクを明示承認すべき設計課題である。

## 6. ログ設計

フォーマットは`logging_config.py`の`%(asctime)s %(levelname)s %(name)s %(message)s`、レベルは`LOG_LEVEL`(デフォルトINFO)、出力先は標準出力である。

| 対象 | レベル | 主な属性 | 注意点 |
|---|---|---|---|
| Stripe Session作成/取得失敗 | ERROR | user_idまたはsession_id、例外 | APIレスポンスへ例外詳細を返さない形へ移行する |
| 決済Session所有者不一致 | WARNING | session_id、両user_id | 不正利用調査対象 |
| Stripe返金失敗 | ERROR | order_id、例外 | 金銭処理のためアラート対象 |
| レート制限超過 | WARNING | IPを含むキー | 保持期間・アクセス制御を運用設計で定める |
| SMTP送信成功/失敗 | INFO/ERROR | 宛先メール、件名、例外 | 個人情報を含むためマスキング・保持期間をセキュリティ設計で定める |

現状はrequest ID、trace ID、構造化JSON、メトリクス、アラート条件を持たない。これらは運用監視設計で定義する。

## 7. 関連文書

- [API仕様](../external_design/02_api_spec.md)
- [外部インターフェース設計](../external_design/03_external_interface.md)
- [通知設計](../external_design/04_notification_design.md)
- [シーケンス図](03_sequence_diagram.md)
- [非機能要件](../requirements/06_nonfunctional_requirements.md)
