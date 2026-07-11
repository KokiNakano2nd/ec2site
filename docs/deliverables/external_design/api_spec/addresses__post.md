# POST /addresses — 配送先を登録する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 配送先管理業務 / **リソース**: /addresses

**概要**: 配送先を登録する(S-007)。デフォルト指定時は他の配送先のデフォルトを解除する
**元になった機能**: F-015
**認証**: 必要(Bearerトークン)

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| name | string | 必須 | 宛名 |
| postal_code | string | 必須 | 郵便番号 |
| prefecture | string | 必須 | 都道府県 |
| city | string | 必須 | 市区町村 |
| address_line1 | string | 必須 | 番地・建物名 |
| address_line2 | string \| null | 任意 | 番地・建物名(続き) |
| phone | string \| null | 任意 | 電話番号 |
| is_default | boolean | 任意(デフォルトfalse) | デフォルト配送先に設定するか |

**レスポンス(201)**: 配送先オブジェクト(`GET /addresses`の要素と同一形式)

**エラーレスポンス**: なし
