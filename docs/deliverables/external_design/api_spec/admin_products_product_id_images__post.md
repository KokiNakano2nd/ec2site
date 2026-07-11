# POST /admin/products/{product_id}/images — 商品画像を追加する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品管理業務(管理者向け) / **リソース**: /admin/products/{product_id}/images, /admin/product-images

**概要**: 商品に画像を追加する(S-101)
**元になった機能**: F-022

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| product_id | integer(パスパラメータ) | 必須 | 商品ID |
| image_url | string | 必須 | 画像URL |
| display_order | integer | 任意(デフォルト0) | 表示順 |

**レスポンス(201)**: 商品画像オブジェクト

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 404 | 商品が存在しない | 「商品が見つかりません」 |
