# POST /admin/coupons — クーポンを発行する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: クーポン管理業務(管理者向け) / **リソース**: /admin/coupons

**認証**: 必要(Bearerトークン + 管理者権限)

**概要**: クーポンを発行する(S-102)
**元になった機能**: F-023

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| code | string | 必須 | クーポンコード |
| discount_type | string | 必須 | `percentage`または`fixed` |
| discount_value | float | 必須 | 割引値 |
| max_uses | integer \| null | 任意 | 使用回数上限(無制限の場合null) |

**レスポンス(201)**: クーポンオブジェクト(`is_active: true`, `used_count: 0`)

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 400 | `discount_type`が`percentage`/`fixed`以外 | 「discount_typeは percentage または fixed を指定してください」 |
| 400 | クーポンコードが既に存在する | 「このクーポンコードはすでに存在します」 |
