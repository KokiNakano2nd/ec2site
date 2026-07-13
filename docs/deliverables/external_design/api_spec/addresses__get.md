# GET /addresses — 配送先一覧を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: 商品購入業務 / **リソース**: /addresses(商品購入業務からの参照)

**概要**: カート画面(S-002)の配送先選択欄に表示するための一覧を取得する。登録・編集・削除等のCRUD操作は配送先管理業務(下記「配送先管理業務」節)で扱う
**元になった機能**: F-018
**認証**: 必要(Bearerトークン)

**リクエスト**: なし

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| id | integer | 配送先ID |
| name | string | 宛名 |
| postal_code | string | 郵便番号 |
| prefecture | string | 都道府県 |
| city | string | 市区町村 |
| address_line1 | string | 番地等 |
| address_line2 | string \| null | 建物名等 |
| phone | string \| null | 電話番号 |
| is_default | boolean | デフォルト配送先か |

**エラーレスポンス**: なし
