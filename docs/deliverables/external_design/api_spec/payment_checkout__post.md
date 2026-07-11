# POST /payment/checkout — Stripe決済セッションを作成する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品購入業務 / **リソース**: /payment

**概要**: クレジットカード決済のためにStripe Checkout Sessionを作成し、遷移先URLを返す(UC-002)
**元になった機能**: F-005
**認証**: 必要(Bearerトークン)

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| coupon_code | string \| null | 任意 | 適用するクーポンコード |

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| session_url | string | Stripeの決済ページURL(このURLへリダイレクトする) |

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 400 | Stripeが未設定(`STRIPE_SECRET_KEY`未設定) | 「Stripeが設定されていません」 |
| 400 | カートが空 | 「カートが空です」 |
| 500 | Stripe側でのSession作成エラー | 「Stripe エラー: {詳細}」 |

**関連する外部インターフェース**: `03_external_interface.md`(Stripe Checkout Session作成)
