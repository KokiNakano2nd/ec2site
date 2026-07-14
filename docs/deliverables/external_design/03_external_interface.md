# 外部インターフェース仕様

## 1. 連携先: Stripe (Checkout Session)

**概要**: クレジットカード決済をStripeに委任する。カード情報は自システムで保持しない(NFR-008)
**公式ドキュメント**: https://stripe.com/docs/api/checkout/sessions(Stripe公式。詳細な項目・仕様変更はStripe公式ドキュメントを一次情報源とする)
**連携方式(現行)**: REST API呼び出し(サーバー間通信、`backend/app/routers/payment.py`からStripe SDK経由) + リダイレクト(顧客のブラウザをStripeの決済ページへ遷移)
**認証情報の扱い**: `STRIPE_SECRET_KEY`を環境変数で管理する。コード・リポジトリには値を含めない

**元になったAPI仕様**: `POST /payment/checkout`, `POST /payment/complete`(`02_api_spec.md`)

### 送信データ(Session作成時、`POST /payment/checkout`内)

| 項目名 | 内容 |
|---|---|
| payment_method_types | `["card"]`(固定) |
| line_items[0].price_data.currency | `"jpy"`(固定) |
| line_items[0].price_data.product_data.name | `"TechStore ご注文"`(固定文言。個別商品名は送らない) |
| line_items[0].price_data.unit_amount | 割引後・税込の合計金額(整数、円) |
| mode | `"payment"`(固定) |
| success_url | `{FRONTEND_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}` |
| cancel_url | `{FRONTEND_URL}/` |
| metadata.user_id | 現在ログイン中のユーザーID(文字列) |
| metadata.coupon_code | 適用中のクーポンコード(未適用時は空文字列) |
| customer_email | ログインユーザーのメールアドレス |

### 受信データ(決済完了確認時、`POST /payment/complete`内)

| 項目名 | 内容 |
|---|---|
| session.payment_status | 決済ステータス。`"paid"`であることを確認する |
| session.metadata.user_id | Session作成時に送った`user_id`と、現在のログインユーザーのIDが一致するか確認(不一致時は403) |
| session.metadata.coupon_code | 決済完了処理(注文金額の再計算)で再利用するクーポンコード |
| session.url | (`POST /payment/checkout`のレスポンス`session_url`として顧客のブラウザへ返す) |

### エラーハンドリング

| 状況 | 自システムの挙動 |
|---|---|
| Stripe未設定(`STRIPE_SECRET_KEY`未設定) | 400「Stripeが設定されていません」 |
| Session作成時にStripe側でエラー | 502「決済サービスとの通信に失敗しました」 |
| Session取得(照会)時にStripe側でエラー | 400「決済セッションを確認できませんでした」 |
| 決済ステータスが`paid`でない | 400「支払いが完了していません」 |
| `metadata.user_id`が現在のユーザーと不一致 | 403「アクセス権限がありません」 |

現行実装はStripe例外の`str(e)`をAPIレスポンスへ含める。外部エラー詳細や内部識別子を顧客へ過剰開示する可能性があるため、本番化前に安定した内部エラーコードと一般化したメッセージへ置換し、詳細は機密情報を除去したサーバーログだけへ記録する。また、Stripe SDK呼び出しの明示タイムアウトは未実装(NFR-004)である。

### 現行の決済確定経路とリスク

- 現状のEC_SITE実装はWebhookを使用しない。顧客のブラウザが`success_url`にリダイレクトされ、フロントエンドがそのURLの`session_id`を使って`POST /payment/complete`を呼び出す方式(ブラウザ経由のリダイレクト+セッション照会方式)である
- success redirectが到達しない、タブが閉じられる場合は支払済み未確定となるリスクが残る。同じPaymentIntentの逐次再送は既存注文を返す。新規DBには一意制約があるが既存DBへのmigrationとWebhookイベント台帳は未実装であり、同時要求の完全な冪等性は保証しない

### 本番化目標: Stripe Webhook正経路

次は承認済みの設計目標であり、未実装である。詳細なendpointと保存schemaは実装変更時にADR/API/テーブル設計へ反映する。

| 項目 | 目標仕様 |
|---|---|
| endpoint | `POST /webhooks/stripe`等の認証不要専用endpoint。公開パスは実装時に確定 |
| 対象event | 少なくとも`checkout.session.completed`。非同期決済方法を追加する場合は成功/失敗eventを追加 |
| authenticity | raw request bodyと`Stripe-Signature`をWebhook signing secretで検証。Bearer/JWT認証で代替しない |
| acknowledgement | 署名・受理可否を判定後、Stripe再試行を考慮して速やかに2xx/非2xxを返す。重い後続処理は分離を検討 |
| idempotency | Stripe event IDをUNIQUEで記録し、処理済みeventは副作用を再実行せず2xxを返す |
| order key | Checkout Session/PaymentIntent IDを注文または決済台帳で一意化する |
| consistency | 注文・在庫・クーポン更新を1 DB transactionにまとめ、StripeとDBをまたぐ失敗は再試行/照合可能にする |
| browser role | success pageは結果表示・状態pollingのみとし、注文確定の正経路にしない |
| verification | 重複、順不同、遅延、署名不正、途中失敗、再試行をsandbox/結合テストする |

Stripeはfulfillmentをlanding pageだけに依存せずWebhookで行うことを推奨している。公式: https://docs.stripe.com/checkout/fulfillment

## 2. 連携先: SMTP(メール送信基盤)

**概要**: 注文確認・注文ステータス変更を顧客に通知するメールを送信する(`04_notification_design.md`のN-001, N-002)
**公式ドキュメント**: SMTP自体はRFC 5321(https://www.rfc-editor.org/rfc/rfc5321 )に準拠する標準プロトコルであり、特定の外部サービス固有の仕様ではない。実際の接続先(SMTPサーバー)は環境変数で切り替え可能なため、本番でどのメール配信サービス(例: SendGrid, AWS SES等)を使うかは未確定。使用サービスを確定した場合、当該サービスの公式ドキュメントへのリンクをここに追記すること
**連携方式**: `smtplib`(Python標準ライブラリ)によるSMTP通信(STARTTLS)。サーバー間通信のみで、顧客のブラウザからの直接接続はない
**認証情報の扱い**: `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `FROM_EMAIL`を環境変数で管理する。コード・リポジトリには値を含めない(`backend/app/email_utils.py`)

**元になったAPI仕様**: `POST /orders`, `POST /payment/complete`(注文確定時、N-001), `PATCH /admin/orders/{order_id}/status`(N-002)

### 送信データ

| 項目名 | 内容 |
|---|---|
| From | `FROM_EMAIL`(環境変数、デフォルト`noreply@techstore.local`) |
| To | 通知対象顧客の`User.email` |
| Subject | N-001「【TechStore】ご注文確認 #{order_id}」、N-002「【TechStore】注文ステータス更新 #{order_id}（{ステータスラベル}）」(`04_notification_design.md`参照) |
| Body | HTML形式(`text/html`)。テンプレートファイルは存在せずPython文字列で組み立て(`04_notification_design.md`備考参照) |

### エラーハンドリング

| 状況 | 自システムの挙動 |
|---|---|
| `SMTP_HOST`未設定(開発環境等) | 実際の送信は行わず、メール件名・本文を標準出力に表示するのみ(エラーにはしない) |
| SMTP接続・送信時に例外発生(接続失敗、認証失敗等) | `send_email`内で例外を捕捉しERRORレベルでログ出力(`logging_config.py`、2026-07-11追加)。呼び出し元(注文確定処理・ステータス更新処理)は失敗させない(処理自体は成功として扱う) |

### 現在の実装に関する注記

- Webhook/バウンス通知(配信不能メールの通知)には対応していない。送信の成否は自システム側のログでのみ把握でき、宛先メールアドレスが実在しない場合等の検知はできない
- SMTP未設定時の標準出力には宛先、パスワードリセット/メール確認URLとトークンが含まれる。本番ではSMTP未設定を起動エラーとし、秘密トークンをログへ出さない。現行開発ログも共有前にマスクする
- 明示的な接続/読取タイムアウト、再試行、送信キュー、delivery/bounce webhook、テンプレートのescaping方針は未実装である。本番化前にproviderを決定し、注文transactionとメール送信を分離した再送可能な方式を設計する
- 本ドキュメントの「送信データ」節は`04_notification_design.md`(通知設計書)のN-001/N-002と一部重複するが、`04_notification_design.md`が「業務観点でどの通知が必要か」を定義するのに対し、本節は「外部連携(SMTPプロトコル)としてどう接続するか」を定義する、という役割分担とする
