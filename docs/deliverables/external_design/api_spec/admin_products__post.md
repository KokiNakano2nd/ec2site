# POST /admin/products — 商品を登録する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品管理業務(管理者向け) / **リソース**: /admin/products

**認証**: 必要(Bearerトークン + 管理者権限。`get_current_admin`、NFR-011参照)

**概要**: 新規商品を登録する(S-101)
**元になった機能**: F-020

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | string | 必須 | 商品名 |
| description | string \| null | 任意 | 商品説明 |
| price | float | 必須 | 価格 |
| stock | integer | 必須 | 在庫数 |
| image_url | string \| null | 任意 | メイン画像URL |
| category | string \| null | 任意 | カテゴリ |

**レスポンス(201)**: 商品オブジェクト(`GET /products`の要素と同一形式)

**エラーレスポンス**: なし
