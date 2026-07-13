# GET /products — 商品一覧を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品購入業務 / **リソース**: /products

**概要**: 商品を検索・一覧表示する(`ProductList`から呼び出し。フロントエンドは現在クライアント側フィルタを使うが、APIはサーバー側検索(`q`)にも対応している)
**元になった機能**: F-038(`03_function_list.md`)
**認証**: 不要

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| q | string(クエリパラメータ) | 任意 | 商品名・説明文の部分一致検索キーワード |

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| id | integer | 商品ID |
| name | string | 商品名 |
| description | string \| null | 商品説明 |
| price | float | 価格(税抜) |
| stock | integer | 在庫数 |
| image_url | string \| null | 商品画像URL |
| category | string \| null | カテゴリ |
| created_at | datetime | 登録日時 |
| images | array | 追加画像一覧(`id`, `image_url`, `display_order`) |

**エラーレスポンス**: なし
