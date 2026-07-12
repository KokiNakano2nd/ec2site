# GET /admin/products/low-stock — 低在庫の商品一覧を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品管理業務(管理者向け) / **リソース**: /admin/products/low-stock

**認証**: 必要(Bearerトークン + 管理者権限。`get_current_admin`、NFR-011参照)

**概要**: `low_stock_threshold`が設定済みで、かつ在庫数がしきい値以下の商品の一覧を取得する(S-101, S-104)
**元になった機能**: F-034

**リクエスト**: なし

**レスポンス(200)**: 商品オブジェクトの配列(`GET /products`の要素と同一形式)。`low_stock_threshold`が未設定(NULL)の商品は含まれない

**エラーレスポンス**: なし
