# User Story 記載ルール・テンプレート

対象ドキュメント: `docs/deliverables/demand_definition/02_user_stories.md`

このファイルはUser Storyを作成する際の共通ルールをまとめたものです。個別機能のUser Storyを作成する際は、このルールに従って記述してください。

## 1. 記法のベース

- 本文の型は **Connextra形式**(User Story発祥の記法)に準拠する
- 書いたあとの品質チェックは **INVEST基準**(Mike Cohn)を用いる
- User Storyは単体で完結させず、**3 C's(Card / Conversation / Confirmation)** の原則に従い、必ずConfirmation(受け入れ条件)を添える

## 2. 基本フォーマット

```markdown
### US-001: 返品したい商品を申請する

**As a** 顧客
**I want** 購入した商品の返品を申請したい
**So that** 不備・イメージ違いの商品について返金を受けられる

**関連する機能一覧項目**: F-01 返品申請受付機能
**関連する業務フロー図ステップ**: 商品返品受付業務 ステップ1〜2

**Confirmation(受け入れ条件)**:
- 単純な場合 → Given-When-Thenで直接記載
- 複雑な場合(分岐・例外が多い) → `01_use_cases.md` の該当ユースケースへリンク

**複雑度判定**: 単純 / 複雑(該当ユースケース: UC-001)
```

## 3. 項番ルール

- `US-XXX` の3桁連番(機能一覧の登場順とは一致させなくてよい。作成順でよい)
- 1つのUser Storyは1つの目的(goal)のみを扱う。「〜と、〜もしたい」のように複数の目的を1つのストーリーに詰め込まない(INVESTの Independent / Small に反するため)

## 4. INVESTチェックリスト

各User Story作成後、以下を確認する。

| 項目 | 確認内容 |
|---|---|
| Independent | 他のストーリーの完成を前提にしていないか |
| Negotiable | 実装方法を決め打ちしていないか(「〜画面に〜ボタンを設置する」のような実装指定を書いていないか) |
| Valuable | ユーザー(顧客・社内担当者)にとっての価値が「So that」に明記されているか |
| Estimable | 何をすればよいか具体的にイメージできる粒度か |
| Small | 1つの受け入れ条件(またはユースケース1本)で完結する大きさか |
| Testable | Confirmation欄が書けているか(空欄のまま残っていないか) |

## 5. 複雑度判定のルール

- 分岐・例外条件が **2つ以下** → 単純 → Given-When-Thenで直接受け入れ条件を記載
- 分岐・例外条件が **3つ以上、または業務ルールの深掘りが必要** → 複雑 → `01_use_cases.md` にユースケースを起こし、User Story側はリンクのみ記載

```markdown
**Confirmation(受け入れ条件)**:

Given 注文から8日以内である
When 顧客が返品を申請する
Then 返品受付番号が発行される
```

## 6. ロール(role)の書き方

- 「顧客」「CS担当者」「倉庫担当者」など、業務フロー図に登場するアクター名と表記を統一する(表記ゆれを避けるため、業務フロー図側のアクター名をそのまま使う)
- システム内部の処理主体(バッチ等)はUser Storyの主語にしない。User Storyは常に人の視点で書く

## 7. ファイル内の構成順序

`02_user_stories.md` 内では、業務フロー図の機能領域(見出し)ごとにUser Storyをまとめる。

```markdown
## 商品返品受付業務

### US-001: 返品したい商品を申請する
...

### US-002: 返品可否の判定結果を受け取る
...
```

## 8. 参考文献(ソース)

このテンプレートのルールは以下の公開資料をベースにしている。

- Connextra形式(As a / I want / So that)
  - 2001年頃、Connextra社のチームが提唱したとされる記法。単一の公式URLは存在しないため、Mike Cohnの著書等の二次資料経由で参照するのが一般的
- Mike Cohn, "User Stories Applied: For Agile Software Development" (書籍, 2004)
  - INVEST基準の出典。要約記事: https://www.mountaingoatsoftware.com/agile/user-stories
- Ron Jeffries, "Card, Conversation, Confirmation"(3 C's)
  - XP(Extreme Programming)関連の記事。Ron Jeffries氏のサイト(xprogramming.com / ronjeffries.com)で公開されているが、正確なURLは変更される場合があるため検索を推奨
