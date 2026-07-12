# 内部エラー・例外設計書

テンプレート: [[../../templates/internal_design/error_handling_design_template|docs/templates/internal_design/error_handling_design_template.md]]
全体ルール: [[../../README|docs/README.md]](UML記法統一ルール(必須)を含む)

対象: `02_api_spec.md`(外部設計)に記載した全業務(商品購入業務・会員管理・お気に入り・レビュー投稿・配送先管理・商品管理・クーポン管理・注文管理・売上分析)のエンドポイントのうち、エラーレスポンスが存在するもの。`main.py`の実装(2026-07-06時点)に基づく。

### GET /products/{product_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:96` | `db.query(Product).filter(id==product_id).first()`が`None` | 404「Product not found」 | なし | なし(参照系のため不要) |

### POST /cart

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:147` | 指定`product_id`が存在しない | 404「商品が見つかりません」 | なし | なし(DB更新前) |
| `main.py:156` | カート追加後の数量が`product.stock`を超える | 400「在庫数を超える数量は指定できません」 | なし | なし(DB更新前) |

### PATCH /cart/{cart_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:186` | カート行が存在しない、または他ユーザーの行 | 404「カート内に該当の商品が見つかりません」 | なし | なし(DB更新前) |
| `main.py:189` | `quantity < 1` | 400「数量は1以上を指定してください」 | なし | なし(DB更新前) |
| `main.py:191` | `quantity`が`product.stock`を超える | 400「在庫数を超える数量は指定できません」 | なし | なし(DB更新前) |

### DELETE /cart/{cart_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:211` | カート行が存在しない | 404「カート内に該当の商品が見つかりません」 | なし | なし(DB更新前) |

### GET /coupons/validate

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:349` | `code`に一致する有効(`is_active`)なクーポンが存在しない | 404「無効なクーポンコードです」 | なし | なし(参照系) |
| `main.py:351` | `max_uses`が設定済みかつ`used_count >= max_uses` | 400「このクーポンは使用回数の上限に達しています」 | なし | なし(参照系) |

### POST /orders

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:226` | カート内商品が0件 | 400「カートが空です」 | なし | なし(DB更新前) |
| `main.py:230` | いずれかのカート行の`quantity`が`product.stock`を超える | 400「{商品名}の在庫数が不足しています」 | なし | なし(DB更新前) |
| `main.py:246` | `coupon_code`指定時、一致する有効なクーポンが存在しない | 400「無効なクーポンコードです」 | なし | なし(DB更新前) |
| `main.py:248` | クーポンの`used_count >= max_uses` | 400「このクーポンは使用回数の上限に達しています」 | なし | なし(DB更新前) |

- `db.commit()`(`main.py:283`)より前に上記いずれかの例外が発生するため、DB更新のロールバックは発生しない(そもそもコミット前)。
- `send_order_confirmation`(`main.py:286`)の呼び出しは`db.commit()`の後に行われる。`email_utils.py`の`send_email`内で例外を捕捉し、送信成功時はINFOレベル、失敗時はERRORレベルで`logger`にログ出力する(2026-07-11追加)。失敗しても注文自体は既にコミット済みのため、注文のロールバックは発生しない。

### GET /config

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| (なし) | エラーレスポンスなし(`02_api_spec.md`) | - | - | - |

### POST /payment/checkout

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:847` | `STRIPE_SECRET_KEY`未設定 | 400「Stripeが設定されていません」 | なし | なし(DB更新前) |
| `main.py:851` | カート内商品が0件 | 400「カートが空です」 | なし | なし(DB更新前) |
| `main.py:891` | `stripe_lib.checkout.Session.create`が例外を発生させる | 500「Stripe エラー: {詳細}」 | あり(ERRORレベル、`logger.error`。`user_id`と例外内容を記録。2026-07-11追加) | なし(DB更新なし。本エンドポイントはStripeセッション作成のみで、DBへの注文作成は行わない) |

- **改善提案**: `main.py:861`(`if coupon:`)の条件では、`coupon_code`が指定されていて該当クーポンが見つからない場合でもエラーにせず、割引なしのまま処理を続行している。これは`POST /orders`(UC-003、`main.py:246`)が同条件で400エラーを返すのと挙動が異なる。ユーザーには「クーポンが適用されなかったこと」が伝わらないため、意図的な仕様か実装漏れかを業務エキスパートに確認することを推奨する(`03_sequence_diagram.md`の補足にも記載)。

### POST /payment/complete

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:902` | `STRIPE_SECRET_KEY`未設定 | 400「Stripeが設定されていません」 | なし | なし(DB更新前) |
| `main.py:906`-`907` | `stripe_lib.checkout.Session.retrieve`が例外を発生させる | 400「セッション取得失敗: {詳細}」 | あり(ERRORレベル、`logger.error`。`session_id`と例外内容を記録。2026-07-11追加) | なし(DB更新前) |
| `main.py:910` | `session.payment_status != "paid"` | 400「支払いが完了していません」 | なし | なし(DB更新前) |
| `main.py:912` | `session.metadata.user_id`が現在のログインユーザーと一致しない | 403「アクセス権限がありません」 | あり(WARNINGレベル、`logger.warning`。`session_id`・セッション側`user_id`・リクエスト側`user_id`を記録。2026-07-11追加。「改善提案まとめ」の指摘に対応) | なし(DB更新前) |
| `main.py:916` | カート内商品が0件(二重決済等) | 400「カートが空です（既に注文済みかもしれません）」 | なし | なし(DB更新前) |

- `db.commit()`(`main.py:963`)より前に上記いずれの例外も発生するため、部分的なDB更新が残ることはない。

### POST /auth/register

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:104` | メールアドレスが既に登録済み | 400「このメールアドレスは既に登録されています」 | なし | なし(DB更新前) |

### POST /auth/login

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:120` | メールアドレスが存在しない、またはパスワード不一致 | 401「メールアドレスまたはパスワードが正しくありません」 | なし | なし(参照系) |

### DELETE /users/me(2026-07-11追加)

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py`(退会処理) | 入力されたパスワードが現在のユーザーのものと不一致 | 403「パスワードが正しくありません」 | なし | なし(DB更新前) |
| `main.py`(退会処理) | メール送信(`send_account_deletion_email`)失敗 | エラーにせず処理続行(既にDB更新は完了しているため) | ERRORレベルでログ出力(「ログ設計」節参照) | なし(メール送信はDBコミット後) |

### POST /orders/{order_id}/cancel(2026-07-11追加)

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `routers/orders.py`(キャンセル処理) | 注文が存在しない、または当該顧客のものでない | 404「注文が見つかりません」 | なし | なし(DB更新前) |
| `routers/orders.py`(キャンセル処理) | ステータスが`pending`/`processing`以外 | 400「発送済みの注文はキャンセルできません」 | なし | なし(DB更新前) |
| `routers/orders.py`(キャンセル処理) | Stripe返金API(`stripe.Refund.create`)が例外を発生させる | 500「返金処理に失敗しました」 | あり(ERRORレベル、`logger.error`。`order_id`と例外内容を記録) | なし(Stripe呼び出しは在庫・ステータス更新より前に行い、返金失敗時はDB更新を行わない) |

### POST /orders/{order_id}/return-request(2026-07-11追加)

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `routers/orders.py`(返品申請処理) | 注文が存在しない、または当該顧客のものでない | 404「注文が見つかりません」 | なし | なし(DB更新前) |
| `routers/orders.py`(返品申請処理) | ステータスが`shipped`以外 | 400「この注文は返品を申請できません」 | なし | なし(DB更新前) |

### PATCH /admin/orders/{order_id}/return(2026-07-11追加)

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `routers/admin_orders.py`(返品承認・却下処理) | 注文が存在しない | 404「注文が見つかりません」 | なし | なし(DB更新前) |
| `routers/admin_orders.py`(返品承認・却下処理) | ステータスが`return_requested`以外 | 400「この注文は返品申請中ではありません」 | なし | なし(DB更新前) |
| `routers/admin_orders.py`(返品承認・却下処理) | `action`が`approve`/`reject`以外 | 400「actionはapproveまたはrejectを指定してください」 | なし | なし(DB更新前) |
| `routers/admin_orders.py`(返品承認・却下処理、承認時のみ) | Stripe返金API(`stripe.Refund.create`)が例外を発生させる | 500「返金処理に失敗しました」 | あり(ERRORレベル、`logger.error`。`order_id`と例外内容を記録) | なし(UC-006と同様、返金失敗時はDB更新を行わない) |

### POST /favorites/{product_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:430` | 商品が存在しない | 404「商品が見つかりません」 | なし | なし(DB更新前) |

### DELETE /favorites/{product_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| (なし) | 対象が存在しない場合もエラーにせず204を返す(`main.py:456`の`if fav:`) | - | - | - |

### POST /products/{product_id}/reviews

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:486` | 商品が存在しない | 404「商品が見つかりません」 | なし | なし(DB更新前) |
| `main.py:488` | 評価が1〜5の範囲外 | 400「評価は1〜5で指定してください」 | なし | なし(DB更新前) |
| `main.py:495` | この顧客がこの商品に投稿済み | 400「すでにレビューを投稿済みです」 | なし | なし(DB更新前) |

### PATCH /addresses/{address_id}, DELETE /addresses/{address_id}, POST /addresses/{address_id}/default

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:785`(PATCH) | 配送先が存在しない、または他ユーザーの配送先 | 404「住所が見つかりません」 | なし | なし(DB更新前) |
| `main.py:807`(DELETE) | 同上 | 404「住所が見つかりません」 | なし | なし(DB更新前) |
| `main.py:826`(POST /default) | 同上 | 404「住所が見つかりません」 | なし | なし(DB更新前) |

### PATCH /admin/products/{product_id}, DELETE /admin/products/{product_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:532`(PATCH) | 商品が存在しない | 404「商品が見つかりません」 | なし | なし(DB更新前) |
| `main.py:550`(DELETE) | 同上 | 404「商品が見つかりません」 | なし | なし(DB更新前) |

### /admin/products/{product_id}/images, /admin/product-images/{image_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:612`(POST images) | 商品が存在しない | 404「商品が見つかりません」 | なし | なし(DB更新前) |
| `main.py:633`(PATCH product-images) | 画像が存在しない | 404「画像が見つかりません」 | なし | なし(DB更新前) |
| `main.py:649`(DELETE product-images) | 同上 | 404「画像が見つかりません」 | なし | なし(DB更新前) |

### POST /admin/coupons, PATCH /admin/coupons/{coupon_id}, DELETE /admin/coupons/{coupon_id}

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:374`(POST) | `discount_type`が`percentage`/`fixed`以外 | 400「discount_typeは percentage または fixed を指定してください」 | なし | なし(DB更新前) |
| `main.py:377`(POST) | クーポンコードが既に存在する | 400「このクーポンコードはすでに存在します」 | なし | なし(DB更新前) |
| `main.py:393`(PATCH) | クーポンが存在しない | 404「クーポンが見つかりません」 | なし | なし(DB更新前) |
| `main.py:408`(DELETE) | 同上 | 404「クーポンが見つかりません」 | なし | なし(DB更新前) |

### PATCH /admin/orders/{order_id}/status

| 発生箇所 | 例外/条件 | 対応するAPIエラー(`02_api_spec.md`) | ログ出力 | ロールバックの有無 |
|---|---|---|---|---|
| `main.py:566` | 注文が存在しない | 404「注文が見つかりません」 | なし | なし(DB更新前) |

- **改善提案**: `main.py:571`(`send_status_notification`呼び出し)は`db.commit()`(`main.py:568`)より後に実行されるため、メール送信に失敗しても注文ステータスの更新自体はロールバックされない(N-001と同様の設計)。加えて、`email_utils.py`の`send_status_notification`は`status`が`processing`/`shipped`/`completed`以外(例: `pending`)の場合、無言でメール送信をスキップする(`04_notification_design.md` N-002の実装上の注記を参照)。管理者がステータスを「受付中」に変更した場合に通知が届かないことをどう扱うかは、業務エキスパートへの確認を推奨する。

## 改善提案まとめ

- 上記「POST /payment/checkout」の項で述べた、無効なクーポンコード指定時の挙動の`POST /orders`との不一致は、業務エキスパートへの確認を推奨する。
- 注文ステータスを「受付中」(`pending`)に変更した場合、ステータス変更通知メールが送信されない(`email_utils.py`の`status_labels`に`pending`が存在しないため)。意図された仕様か実装漏れかを業務エキスパートに確認することを推奨する。
- ~~「POST /payment/complete」における`user_id`不一致(403)は、不正アクセスの試行を示す可能性があるため、ログ出力を追加することを推奨する(現状は実装されていない)。~~ → 2026-07-11、`logger.warning`によるログ出力を実装済み(上記「POST /payment/complete」の表を参照)。

## ログ設計(2026-07-11追加)

- `backend/app/logging_config.py`で標準の`logging`モジュールを設定(フォーマット: `%(asctime)s %(levelname)s %(name)s %(message)s`、レベルは環境変数`LOG_LEVEL`、デフォルト`INFO`)。出力先は標準出力(コンテナ実行を前提とし、収集はインフラ側のログドライバに委ねる。ログローテーション設計は対象外)。
- 現時点でログ出力を実装しているのは、外部サービス(Stripe, SMTP)呼び出しの失敗、決済完了時の不正アクセス試行(`user_id`不一致)、退会完了メール送信失敗(2026-07-11追加、上記「DELETE /users/me」参照)、注文キャンセル・返品承認時のStripe返金失敗(2026-07-11追加、NFR-017対応、上記「POST /orders/{order_id}/cancel」「PATCH /admin/orders/{order_id}/return」参照)の6箇所のみ(NFR-005「決済関連のログ出力」・NFR-017「返金関連のログ出力」に対応。退会関連は決済ではないが、SMTP失敗という同種の障害追跡目的のため同じログ基盤を使う)。それ以外のバリデーションエラー(404/400等、パスワード不一致の403を含む)は、クライアントへのレスポンスで原因が明確なため、現状ログ出力の対象外としている。範囲を広げる場合は本ドキュメントを更新すること。
