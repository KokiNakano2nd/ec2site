# API仕様書 記載ルール・テンプレート

対象ドキュメント: `docs/deliverables/external_design/02_api_spec.md`

このファイルはAPI仕様書を作成する際の共通ルールをまとめたものです。`03_function_list.md`(機能一覧)の各機能に対応するエンドポイントを、実装(バックエンドのルーティング)に基づいて記述します。フォーマットはOpenAPIではなく**Markdownテーブル**を採用する(他の要件定義・外部設計ドキュメントとの記法の一貫性、差分レビューのしやすさを優先するため)。

## 1. 記法のベース

- HTTPメソッドの意味づけ(GET/POST/PATCH/DELETE等)は **RFC 9110 (HTTP Semantics)** に準拠する
- リソース指向のURL設計・ステータスコードの使い分けの考え方は **Roy Fielding, "Architectural Styles and the Design of Network-based Software Architectures"(REST)** に準拠する

## 2. 基本フォーマット

```markdown
### POST /orders — 注文を作成する

**概要**: カート内商品から注文を作成する(現金/代引き等、Stripe決済を使わない注文フロー)
**元になった機能**: F-004(`03_function_list.md`)
**認証**: 必要(Bearerトークン)

**リクエスト**:
| 項目名 | 型 | 必須 | 説明 |
|---|---|---|---|
| coupon_code | string | 任意 | 適用するクーポンコード |

**レスポンス(200)**:
| 項目名 | 型 | 説明 |
|---|---|---|
| id | integer | 注文ID |
| total_price | float | 合計金額(税込) |
| discount_amount | float | 割引額 |
| status | string | 注文状態 |

**エラーレスポンス**:
| ステータスコード | 条件 | メッセージ |
|---|---|---|
| 400 | カートが空 | 「カートが空です」 |
| 400 | 在庫不足 | 「在庫数を超える数量は指定できません」 |
| 404 | クーポンが存在しない/無効 | 「無効なクーポンコードです」 |
```

## 3. 項番ルール

- 見出しは `<HTTPメソッド> <パス> — <日本語概要>` とする(項番は振らない。メソッド+パスの組がユニークキーになるため)

## 4. 記載ルール

- リクエスト/レスポンスの項目は、実装(スキーマ定義)に存在するものだけを書く。将来追加予定の項目を先に書かない
- エラーレスポンスは、実装で実際に返しているステータスコードとメッセージをそのまま転記する(架空のエラーメッセージを作らない)
- 認証が必要なエンドポイントは「認証」欄に明記する。管理者権限が必要な場合は「認証: 必要(管理者)」とする

## 5. 後続ドキュメントへの接続

- レスポンスの項目は `01_screen_design.md` の表示項目と対応させる
- リクエストの項目は `01_screen_design.md` の入力項目と対応させる
- 内部設計フェーズのテーブル定義書は、ここで定義したレスポンス項目の型と整合させる

## 6. ファイル内の構成順序

`02_api_spec.md` 内では、`03_function_list.md` と同じ機能領域の見出しでまとめ、その中でエンドポイントのパスをリソース単位(`/cart`, `/orders`, `/payment`等)にグルーピングする。

## 7. 参考文献(ソース)

- RFC 9110, "HTTP Semantics", IETF — https://www.rfc-editor.org/rfc/rfc9110
  - HTTPメソッド・ステータスコードの意味づけの出典
- Roy Fielding, "Architectural Styles and the Design of Network-based Software Architectures" (博士論文, 2000) — https://ics.uci.edu/~fielding/pubs/dissertation/top.htm
  - REST(リソース指向のURL設計)の原典
