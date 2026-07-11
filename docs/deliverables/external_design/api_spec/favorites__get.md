# GET /favorites — お気に入り一覧を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: お気に入り管理業務 / **リソース**: /favorites

**概要**: お気に入り画面(S-006)の表示データを取得する
**元になった機能**: F-012
**認証**: 必要(Bearerトークン)

**リクエスト**: なし

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| id | integer | お気に入りID |
| product_id | integer | 商品ID |
| product | object | 商品情報(`GET /products`と同一形式、`ProductOut`) |

**エラーレスポンス**: なし
