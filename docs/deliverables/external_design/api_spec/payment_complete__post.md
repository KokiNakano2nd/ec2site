# POST /payment/complete — Stripe決済完了処理を行う

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品購入業務 / **リソース**: /payment

**概要**: Stripeの決済結果を照会し、注文確定・在庫減算・カート削除・クーポン使用回数更新を行う(UC-002)
**元になった機能**: F-006
**認証**: 必要(Bearerトークン)

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| session_id | string(クエリパラメータ) | 必須 | Stripe Checkout SessionのID |

**レスポンス(200)**: `POST /orders`のレスポンスと同一形式(`status`は`processing`)

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 400 | Stripeが未設定 | 「Stripeが設定されていません」 |
| 400 | Stripeへのセッション照会に失敗 | 「決済セッションを確認できませんでした」 |
| 400 | 決済ステータスが`paid`でない | 「支払いが完了していません」 |
| 403 | セッションの`user_id`が現在のログインユーザーと一致しない | 「アクセス権限がありません」 |
| 400 | カートが既に空(二重決済等) | 「カートが空です（既に注文済みかもしれません）」 |
| 400 | クーポンが無効または使用回数上限到達 | クーポン検証エラー |

**関連する外部インターフェース**: `03_external_interface.md`(Stripe Checkout Session照会)

同じPaymentIntentの完了処理が再送された場合は、新しい注文を作らず既存注文を200で返す。

Stripe Sessionの`amount_total`、およびcheckout時の商品ID・数量・単価・coupon・totalから作ったfingerprintを、確定直前の再計算結果と照合する。金額または明細が異なる場合は注文を作成せず409を返し、支払済み未確定として運用照合を要する。PaymentIntent IDの一意制約はAlembic migration(初回スキーマ)で全DBへ反映され、Webhookイベント台帳([payment_webhook__post.md](payment_webhook__post.md)、`stripe_webhook_events`)と合わせて経路をまたぐ再送でも注文は1件に保たれる。決済確定の正経路はWebhookであり、本APIはsuccess redirect時の補完経路である。
