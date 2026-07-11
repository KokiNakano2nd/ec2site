# 受け入れ条件(Given-When-Then) 記載ルール・テンプレート

対象ドキュメント: なし(単独の実ドキュメントは作らない。`docs/deliverables/demand_definition/02_user_stories.md` 内の各User Storyの「Confirmation(受け入れ条件)」欄に直接記述する)

このファイルは、User Storyのうち「単純」と判定されたものに対して受け入れ条件を書く際の共通ルールをまとめたものです。「複雑」と判定されたものは、この形式ではなく `01_use_cases.md` のユースケースで基本/代替/例外フローとして記述してください。

## 1. 記法のベース

- **Given-When-Then** 形式(BDD: Behavior-Driven Developmentの記法)に準拠する
- 前提(Given) → 操作・イベント(When) → 期待される結果(Then) の3要素で1つの受け入れ条件を表す

## 2. 基本フォーマット

```markdown
**Confirmation(受け入れ条件)**:

Given カートに在庫数5個の商品が入っている
When 顧客がカートの数量を6個に変更しようとする
Then システムは「在庫数を超える数量は指定できません」というエラーを表示する
```

- 1つのUser Storyに複数の受け入れ条件がある場合は、Given-When-Thenのブロックを複数並べる(空行で区切る)

```markdown
**Confirmation(受け入れ条件)**:

Given カートに在庫数5個の商品が入っている
When 顧客がカートの数量を3個に変更する
Then 数量が3個に更新される

Given カートに在庫数5個の商品が入っている
When 顧客がカートの数量を6個に変更しようとする
Then システムは「在庫数を超える数量は指定できません」というエラーを表示する
```

## 3. 記載ルール

- **Given** は状態(すでに成立している事実)を書く。動作は書かない
- **When** は1つの操作・イベントのみを書く。「〜して、さらに〜する」のように複数動作を詰め込まない
- **Then** はシステムの外部から観測できる結果を書く(内部処理の詳細ではない)
- 数値・文言は実装(バックエンドのエラーメッセージ等)に忠実に合わせる。架空の値・文言を作らない
- 1つのUser Storyの受け入れ条件は、原則2つ以下の分岐に収まる粒度にする(3つ以上必要になった場合は、そのUser Storyは「複雑」と判定し直し、`01_use_cases.md` へ昇格させる。[[use_case_template]] の複雑度判定ルールと対応)

## 4. 後続ドキュメントへの接続

- Given-When-Thenの各ブロックは、テスト設計フェーズで結合テスト/E2Eテストのシナリオへそのまま変換できる粒度で書く
- Then句に登場する名詞は、`03_function_list.md` の機能一覧項目の抽出元の一つになる

## 5. 参考文献(ソース)

- Dan North, "Introducing BDD" (2006) — https://dannorth.net/introducing-bdd/
  - Given-When-Then形式(BDD: Behavior-Driven Development)の提唱元
- Cucumber (Gherkin言語) 公式ドキュメント — https://cucumber.io/docs/gherkin/reference/
  - Given-When-Thenの構文リファレンス。実務での記法統一の参照先
