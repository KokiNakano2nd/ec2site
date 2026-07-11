# GET /admin/analytics/top-products — 売れ筋商品を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 売上分析業務(管理者向け) / **リソース**: /admin/analytics

**認証**: 必要(Bearerトークン + 管理者権限)

**概要**: 販売数量上位5件の商品を取得する(S-104)
**元になった機能**: F-029

**レスポンス(200)**: `{name, total_qty, total_revenue}`の配列(上位5件)

**エラーレスポンス**: なし
