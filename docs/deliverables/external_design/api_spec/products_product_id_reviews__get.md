# GET /products/{product_id}/reviews — レビュー一覧を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: レビュー投稿業務 / **リソース**: /products/{product_id}/reviews

**概要**: 商品詳細画面(S-001)のレビューセクションの表示データを取得する(作成日時降順)
**元になった機能**: F-014
**認証**: 不要

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| product_id | integer(パスパラメータ) | 必須 | 商品ID |

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| id | integer | レビューID |
| rating | integer | 評価(1〜5) |
| comment | string \| null | コメント |
| created_at | datetime | 投稿日時 |
| user_email | string | 投稿者のメールアドレス |

**エラーレスポンス**: なし
