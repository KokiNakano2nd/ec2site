# POST /payment/webhook — Stripe Webhookを受信し注文を確定する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品購入業務 / **リソース**: /payment

**概要**: Stripeからの`checkout.session.completed`イベントを受信し、注文確定・在庫減算・カート削除・クーポン使用回数更新を行う決済確定の正経路(UC-002)。ブラウザ経由の`POST /payment/complete`はsuccess redirect不達時の補完経路と位置づける
**元になった機能**: F-006
**認証**: 不要(Bearerトークンの代わりに`Stripe-Signature`ヘッダーをWebhook signing secretで検証する)

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| (body) | JSON(Stripe Eventオブジェクト) | 必須 | raw bodyのまま署名検証に使う |
| Stripe-Signature | ヘッダー | 必須 | `STRIPE_WEBHOOK_SECRET`によるHMAC-SHA256署名 |

**レスポンス(200)**: `{"received": true}`。処理済みevent IDの再送には`{"received": true, "duplicate": true}`

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 400 | Stripeまたは`STRIPE_WEBHOOK_SECRET`が未設定 | 「Stripe Webhookが設定されていません」 |
| 400 | 署名検証失敗(欠落・改ざん・期限切れ) | 「署名を検証できませんでした」 |

**関連する外部インターフェース**: `03_external_interface.md`(Stripe Webhook受信)

冪等性は二段で保証する。(1) Stripe event IDを`stripe_webhook_events`テーブルへUNIQUE記録し、処理済みeventは副作用なしで200を返す。(2) 注文はPaymentIntent IDの一意制約で重複を拒否し、`POST /payment/complete`と経路をまたぐ再送でも注文は1件になる。

`payment_status`が`paid`でないevent、対象外のevent種別は受理(200)して無視する。支払済みだが注文を確定できないケース(カート変更による金額・fingerprint不一致等)は、Stripeが再送しても解消しないためエラーログへ記録のうえ受理し、運用照合に委ねる。処理途中の予期しない失敗は5xxとなり、Stripeの自動再試行に任せる。
