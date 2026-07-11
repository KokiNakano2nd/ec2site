# シーケンス図

テンプレート: [[../../templates/internal_design/sequence_diagram_template|docs/templates/internal_design/sequence_diagram_template.md]]
全体ルール: [[../../README|docs/README.md]](UML記法統一ルール(必須)を含む)

対象: `01_use_cases.md`のユースケースのうち、複数コンポーネント(フロントエンド・API・DB・外部サービス)が絡む処理。本ドキュメントでは UC-002(カード決済)を中心に、UC-003(カード決済なし)も含めて作成する。UC-001(商品を探す/購入検討)は単純な参照系(`GET /products`)のみのため、シーケンス図の作成は省略する([[sequence_diagram_template|テンプレート]]3節「内部処理が複雑なものに限定する」の方針による)。UC-004(レビュー投稿)も、顧客→API→DBの単純な単一コンポーネント処理であり、Stripe連携のような多段の分岐・外部サービス連携を含まないため、同様の理由でシーケンス図の作成を省略する。お気に入り・配送先管理・商品管理・クーポン管理・売上分析の各業務についても、いずれも単一APIコールで完結する処理であり、シーケンス図を要するほどの複雑さはないと判断した。注文管理業務(ステータス更新+通知メール送信)と会員管理業務のUC-005(退会。パスワード検証+DB複数テーブル更新+メール送信+ログアウトの多段処理)は例外的に複雑度が高いため、シーケンス図を作成する。

## UC-003: カード決済を使わずに注文を確定する

`POST /orders`(`backend/app/main.py:218`)に対応する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(CartView)
    participant API as main.py(/orders)
    participant DB as DB(carts, coupons, orders, order_items, products)
    participant Mail as email_utils(send_order_confirmation)

    顧客->>Frontend: 「注文を確定する」ボタン押下
    Frontend->>API: POST /orders (coupon_code)
    API->>DB: カート内商品を取得(carts)
    DB-->>API: カート内商品一覧

    alt カートが空
        API-->>Frontend: 400「カートが空です」
    else カートに商品あり
        API->>API: 各商品の在庫チェック(quantity > product.stock)
        alt 在庫不足の商品あり
            API-->>Frontend: 400「{商品名}の在庫数が不足しています」
        else 在庫あり
            opt クーポンコード指定あり
                API->>DB: クーポンを取得(coupons)
                DB-->>API: クーポン or なし
                alt クーポンが存在しない
                    API-->>Frontend: 400「無効なクーポンコードです」
                else 使用回数上限に到達
                    API-->>Frontend: 400「このクーポンは使用回数の上限に達しています」
                end
            end
            API->>API: 小計・割引額・税(10%)・合計金額を計算
            API->>DB: Order・OrderItemを作成、在庫を減算、カートを削除、クーポン使用回数を加算
            DB-->>API: コミット完了(status="pending")
            API->>Mail: send_order_confirmation(注文情報)
            Mail-->>API: 送信完了(またはログ出力のみ)
            API-->>Frontend: 201 OrderOut
            Frontend->>顧客: 注文完了を表示
        end
    end
```

## UC-002: クレジットカードで支払う

2つのエンドポイント(`POST /payment/checkout`→`POST /payment/complete`)にまたがる。`backend/app/main.py:840`, `main.py:895`。

### 2-1. Checkout Session作成(`POST /payment/checkout`)

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(CartView)
    participant API as main.py(/payment/checkout)
    participant DB as DB(carts, coupons)
    participant Stripe

    顧客->>Frontend: 「カードで決済(Stripe)」ボタン押下
    Frontend->>API: POST /payment/checkout (coupon_code)
    API->>API: STRIPE_SECRET_KEY未設定チェック
    alt Stripe未設定
        API-->>Frontend: 400「Stripeが設定されていません」
    else Stripe設定済み
        API->>DB: カート内商品を取得(carts)
        DB-->>API: カート内商品一覧
        alt カートが空
            API-->>Frontend: 400「カートが空です」
        else カートに商品あり
            opt クーポンコード指定あり
                API->>DB: クーポンを取得(coupons、無効なコードは無視して割引なしのまま続行)
                DB-->>API: クーポン or なし
            end
            API->>API: 小計・割引額・税込金額(int変換)を計算
            API->>Stripe: checkout.Session.create(line_items, metadata.user_id, metadata.coupon_code, success_url, cancel_url, customer_email)
            alt Stripe API呼び出し失敗
                Stripe-->>API: Exception
                API-->>Frontend: 500「Stripe エラー: {詳細}」
            else 作成成功
                Stripe-->>API: session.url
                API-->>Frontend: {session_url}
                Frontend->>顧客: Stripe決済ページへリダイレクト
            end
        end
    end
```

### 2-2. 決済完了処理(`POST /payment/complete`)

フロントエンドは、Stripe決済ページからのリダイレクト後、URLパラメータ `?payment=success&session_id=...` を検知して本APIを呼び出す(`frontend/src/App.jsx`)。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(App.jsx)
    participant API as main.py(/payment/complete)
    participant Stripe
    participant DB as DB(carts, coupons, orders, order_items, products)
    participant Mail as email_utils(send_order_confirmation)

    Stripe->>顧客: 決済完了、success_urlへリダイレクト
    顧客->>Frontend: ?payment=success&session_id=xxx
    Frontend->>API: POST /payment/complete?session_id=xxx
    API->>Stripe: checkout.Session.retrieve(session_id)
    alt Stripe API呼び出し失敗
        Stripe-->>API: Exception
        API-->>Frontend: 400「セッション取得失敗: {詳細}」
    else 取得成功
        Stripe-->>API: session(payment_status, metadata)
        alt payment_status != "paid"
            API-->>Frontend: 400「支払いが完了していません」
        else metadata.user_id != current_user.id
            API-->>Frontend: 403「アクセス権限がありません」
        else 決済済み・本人確認OK
            API->>DB: カート内商品を取得(carts)
            alt カートが空(既に注文済みの可能性)
                DB-->>API: 空
                API-->>Frontend: 400「カートが空です（既に注文済みかもしれません）」
            else カートに商品あり
                DB-->>API: カート内商品一覧
                opt metadata.coupon_code あり
                    API->>DB: クーポンを取得(coupons)
                    DB-->>API: クーポン or なし
                end
                API->>API: 小計・割引額・税(10%)・合計金額を計算
                API->>DB: Order(status="processing")・OrderItemを作成、在庫を減算、カートを削除、クーポン使用回数を加算
                DB-->>API: コミット完了
                API->>Mail: send_order_confirmation(注文情報)
                Mail-->>API: 送信完了(またはログ出力のみ)
                API-->>Frontend: 200 OrderOut
                Frontend->>顧客: 注文完了を表示
            end
        end
    end
```

## 注文管理業務: 注文ステータスを更新する(管理者)

`PATCH /admin/orders/{order_id}/status`(`backend/app/main.py:557`)に対応する。DB更新後にメール送信を行う多段処理のため、UC-002/UC-003と同様にシーケンス図を作成する。

```mermaid
sequenceDiagram
    actor 管理者
    participant Frontend as フロントエンド(AdminOrdersView)
    participant API as main.py(/admin/orders/{id}/status)
    participant DB as DB(orders)
    participant Mail as email_utils(send_status_notification)
    actor 顧客

    管理者->>Frontend: ステータスを選択する
    Frontend->>API: PATCH /admin/orders/{id}/status
    API->>DB: 対象の注文を取得する
    alt 注文が存在しない
        DB-->>API: なし
        API-->>Frontend: 404「注文が見つかりません」
    else 注文が存在する
        DB-->>API: 注文
        API->>DB: ステータスを更新しコミットする
        API->>Mail: send_status_notification(注文者, 注文ID, 新ステータス)
        alt ステータスがprocessing/shipped/completedのいずれか
            Mail->>顧客: ステータス変更通知メールを送信する
        else その他(pending等)
            Mail-->>API: 何もせず終了(メール送信なし)
        end
        API-->>Frontend: 200 OrderOut
        Frontend->>管理者: 更新完了を表示する
    end
```

## UC-005: 退会する(2026-07-11追加)

`DELETE /users/me`(`backend/app/main.py`)に対応する。パスワード検証・DB複数テーブル更新・匿名化前アドレスへのメール送信・フロントエンド側ログアウトという多段処理のため、他のUCと同様にシーケンス図を作成する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(ProfileView)
    participant API as main.py(/users/me)
    participant DB as DB(users, addresses, favorites)
    participant Mail as email_utils(send_account_deletion_email)

    顧客->>Frontend: 「退会する」→パスワード入力→確定
    Frontend->>API: DELETE /users/me (password)
    API->>API: verify_password(password, current_user.hashed_password)
    alt パスワード不一致
        API-->>Frontend: 403「パスワードが正しくありません」
    else パスワード一致
        API->>Mail: send_account_deletion_email(退会前のメールアドレス)
        Mail-->>API: 送信完了(またはログ出力のみ)
        API->>DB: addresses・favoritesを削除する
        API->>DB: usersのemailを匿名化し、hashed_passwordを再利用不能な値に置換、is_active=false、deleted_at=現在時刻に更新
        DB-->>API: コミット完了
        API-->>Frontend: 204
        Frontend->>Frontend: トークンを破棄する(ログアウト)
        Frontend->>顧客: ログイン画面に遷移する
    end
```

- メール送信(`send_account_deletion_email`)は、メールアドレスを匿名化する**前**に呼び出す(匿名化後では本人に届かないため)。この呼び出し順序は`main.py`の実装上の制約であり、他のUC(注文確認メール等)とは異なりDB更新より先に実行する
- 注文履歴(`orders`/`order_items`)・レビュー(`reviews`)は本処理では更新・削除しない(UC-005備考、NFR-013参照)

## 補足: UC-002とUC-003の内部処理の違い

- UC-003(`POST /orders`)はクーポンコードが無効な場合に**400エラーで処理を中断する**が、UC-002(`POST /payment/checkout` / `POST /payment/complete`)はクーポンコードが無効な場合に**エラーにせず割引なしで処理を続行する**(`if coupon:` のみで判定し、`else`のエラー処理がない)。この差異は実装上の挙動であり、意図的な仕様か実装漏れかは要件定義フェーズ・業務エキスパートへの確認が必要な点として、`04_error_handling_design.md`に改善提案として記載する。
- 注文の`status`は、UC-003では`"pending"`、UC-002では`"processing"`となる(コードの実装差異をそのまま記載)。
