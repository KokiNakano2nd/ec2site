# PATCH /admin/product-images/{image_id} — 商品画像を編集する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品管理業務(管理者向け) / **リソース**: /admin/products/{product_id}/images, /admin/product-images

**概要**: 商品画像のURL・表示順を編集する(S-101)
**元になった機能**: F-022

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 404 | 画像が存在しない | 「画像が見つかりません」 |
