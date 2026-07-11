# GET /admin/analytics/summary — 売上サマリーを取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 売上分析業務(管理者向け) / **リソース**: /admin/analytics

**認証**: 必要(Bearerトークン + 管理者権限)

**概要**: 総売上・注文数・会員数・商品数・平均注文額を取得する(S-104)
**元になった機能**: F-029

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| total_revenue | float | 総売上 |
| order_count | integer | 注文数 |
| user_count | integer | 会員数(管理者を除く) |
| product_count | integer | 商品数 |
| avg_order | float | 平均注文額 |

**エラーレスポンス**: なし
