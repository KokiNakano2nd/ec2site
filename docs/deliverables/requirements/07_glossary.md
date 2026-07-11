# 用語集

対象: 要求定義・要件定義・外部設計・内部設計の各ドキュメントに登場するドメイン用語・ID体系の一覧。IEEE 29148やIPA「共通フレーム2013」で要件定義フェーズの成果物として推奨される用語集(Glossary)に相当する

**元になったドキュメント**: [[../demand_definition/02_user_stories|02_user_stories.md]], [[04_conceptual_er]], [[03_function_list]], [[05_screen_list]]、および`backend/app/models.py`の実装

## 1. ドメイン用語(業務エンティティ)

| 用語 | 意味 | 元になったドキュメント |
|---|---|---|
| CUSTOMER(顧客) | 商品を購入するログインユーザー。`is_admin`フラグにより一般顧客と管理者を区別する(独立したADMINエンティティは設けない) | [[04_conceptual_er]] |
| 管理者(admin) | `is_admin=true`のCUSTOMER。`/admin/*`エンドポイントにのみアクセスできる | [[04_conceptual_er]], NFR-011 |
| PRODUCT(商品) | 販売対象の商品。在庫数(`stock`)を持つ | [[04_conceptual_er]] |
| CART_ITEM(カート内商品) | 顧客がカートに入れた商品と数量。決済完了時にORDER_ITEMへ変換され削除される | [[04_conceptual_er]] |
| ORDER(注文) | 決済完了後に確定する注文。小計・割引額・消費税を反映した合計金額を持つ | [[04_conceptual_er]] |
| ORDER_ITEM(注文明細) | 注文に含まれる商品明細。注文時点の数量・価格を保持する(PRODUCTの現在価格とは独立) | [[04_conceptual_er]] |
| COUPON(クーポン) | 割引を適用するためのコード。割引タイプ(`discount_type`: `percentage`/`fixed`)・使用回数上限(`max_uses`)・現在の使用回数(`used_count`)を持つ | [[04_conceptual_er]], UC-001 |
| FAVORITE(お気に入り) | 顧客が登録したお気に入り商品 | [[04_conceptual_er]], US-008 |
| REVIEW(レビュー) | 顧客が商品に投稿した評価(`rating`, 1〜5)とコメント | [[04_conceptual_er]], UC-004 |
| ADDRESS(配送先住所) | 顧客が登録した配送先。氏名・郵便番号・都道府県・市区町村・住所・電話番号・デフォルトフラグ(`is_default`)を持つ | [[04_conceptual_er]], US-010 |

## 2. 割引・クーポン関連の用語(誤解しやすいため個別に定義)

| 用語 | 意味 |
|---|---|
| `discount_type = percentage` | 割引を注文金額に対する割合(%)で計算する方式 |
| `discount_type = fixed` | 割引を固定金額(円)で計算する方式 |
| `max_uses` | クーポンが使用可能な回数の上限。`null`の場合は上限なし |
| `used_count` | クーポンが実際に使用された回数。`max_uses`に達すると以降は使用不可(400エラー) |

## 3. ID体系(ドキュメント間トレーサビリティ用の接頭辞)

| 接頭辞 | 意味 | 定義ドキュメント |
|---|---|---|
| US-xxx | User Story(要求定義) | [[../demand_definition/02_user_stories|02_user_stories.md]] |
| UC-xxx | ユースケース(要件定義)。US のうち分岐が多く複雑なものを昇格させたもの | [[01_use_cases]] |
| F-xxx | 機能一覧の機能項目(要件定義) | [[03_function_list]] |
| S-xxx | 画面一覧の画面項目(要件定義)。`S-1xx`台は管理者向け画面 | [[05_screen_list]] |
| NFR-xxx | 非機能要件の項目(要件定義) | [[06_nonfunctional_requirements]] |
| N-xxx | 通知設計の通知項目(外部設計) | [[../external_design/04_notification_design|04_notification_design.md]] |

## 4. 略語・技術用語

| 用語 | 意味 |
|---|---|
| JWT | JSON Web Token。本プロジェクトの認証方式(HS256、有効期限60分)。NFR-007参照 |
| CORS | Cross-Origin Resource Sharing。フロントエンド(`FRONTEND_URL`)からのAPIアクセスを許可する仕組み |
| Stripe Checkout Session | Stripeが提供する決済ページのセッション。本システムはカード情報を保持せずこのセッションに決済処理を委任する(NFR-008) |

## 参考文献

- IEEE 29148:2018, "Systems and software engineering — Life cycle processes — Requirements engineering" — 要件定義フェーズの成果物として用語集(Glossary/Vocabulary)の整備を推奨
- IPA, 「共通フレーム2013」 — 用語の統一によるドキュメント間の齟齬防止の考え方
