# シーケンス図

テンプレート: [[../../templates/internal_design/sequence_diagram_template|docs/templates/internal_design/sequence_diagram_template.md]]
全体ルール: [[../../README|docs/README.md]](図の記法選定ルールを含む)

対象: `01_use_cases.md`のユースケースのうち、複数コンポーネント(フロントエンド・API・DB・外部サービス)が絡む処理。本ドキュメントでは UC-002(カード決済)を中心に、UC-003(カード決済なし)も含めて作成する。UC-001(クーポン適用)とUC-004(レビュー投稿)は、業務上の分岐は受け入れ条件・エラー設計に記載し、内部連携は顧客→API→DBの単一リクエストで完結するため、シーケンス図を省略する([[../../templates/internal_design/sequence_diagram_template|テンプレート]]3節の選定方針による)。お気に入り・配送先管理・商品管理・クーポン管理・売上分析の各業務についても、単一APIコールで完結する処理は省略する。注文管理業務(ステータス更新+通知メール送信)と会員管理業務のUC-005(退会。パスワード検証+DB複数テーブル更新+メール送信+ログアウトの多段処理)は例外的に複雑度が高いため、シーケンス図を作成する。同様に、UC-006(注文キャンセル)・UC-007(返品申請)・UC-008(返品承認・却下)もStripe返金・在庫戻し等の多段処理を伴うため作成する。

## UC-003: カード決済を使わずに注文を確定する

`POST /orders`(`backend/app/routers/orders.py`)に対応する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(CartView)
    participant API as routers/orders.py(/orders)
    participant Service as services/checkout.py(place_order)
    participant DB as DB(carts, coupons, orders, order_items, products)
    participant Mail as email_utils(send_order_confirmation)

    顧客->>Frontend: 「注文を確定する」ボタン押下
    Frontend->>API: POST /orders (coupon_code)
    API->>Service: place_order(user, coupon_code, status="pending")
    Service->>DB: カート内商品を取得(carts)
    DB-->>Service: カート内商品一覧

    alt カートが空
        API-->>Frontend: 400「カートが空です」
    else カートに商品あり
        Service->>Service: 各商品の在庫チェック(quantity > product.stock)
        alt 在庫不足の商品あり
            API-->>Frontend: 400「{商品名}の在庫数が不足しています」
        else 在庫あり
            opt クーポンコード指定あり
                Service->>DB: クーポンを取得(coupons)
                DB-->>Service: クーポン or なし
                alt クーポンが存在しない
                    API-->>Frontend: 400「無効なクーポンコードです」
                else 使用回数上限に到達
                    API-->>Frontend: 400「このクーポンは使用回数の上限に達しています」
                end
            end
            Service->>Service: 小計・割引額・税(10%)・合計金額を計算
            Service->>DB: Order・OrderItemを作成、在庫を減算、カートを削除、クーポン使用回数を加算
            DB-->>Service: コミット完了(status="pending")
            Service-->>API: Order
            API->>Mail: send_order_confirmation(注文情報)
            Mail-->>API: 送信完了(またはログ出力のみ)
            API-->>Frontend: 201 OrderOut
            Frontend->>顧客: 注文完了を表示
        end
    end
```

## UC-002: クレジットカードで支払う

2つのエンドポイント(`POST /payment/checkout`→`POST /payment/complete`)にまたがる。`backend/app/routers/payment.py`。

### 2-1. Checkout Session作成(`POST /payment/checkout`)

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(CartView)
    participant API as routers/payment.py(/payment/checkout)
    participant DB as DB(carts, coupons)
    participant Stripe

    顧客->>Frontend: 「カードで決済(Stripe)」ボタン押下
    Frontend->>API: POST /payment/checkout (coupon_code)
    API->>API: config.STRIPE_SECRET_KEY未設定チェック
    alt Stripe未設定
        API-->>Frontend: 400「Stripeが設定されていません」
    else Stripe設定済み
        API->>DB: カート内商品を取得(carts)
        DB-->>API: カート内商品一覧
        alt カートが空
            API-->>Frontend: 400「カートが空です」
        else カートに商品あり
            opt クーポンコード指定あり
                API->>DB: 共通checkout serviceでクーポンを検証する
                DB-->>API: クーポン or なし
            end
            API->>API: 小計・割引額・税込金額(int変換)を計算
            API->>Stripe: checkout.Session.create(line_items, metadata.user_id, metadata.coupon_code, success_url, cancel_url, customer_email)
            alt Stripe API呼び出し失敗
                Stripe-->>API: Exception
                API-->>Frontend: 502「決済サービスとの通信に失敗しました」
            else 作成成功
                Stripe-->>API: session.url
                API-->>Frontend: {session_url}
                Frontend->>顧客: Stripe決済ページへリダイレクト
            end
        end
    end
```

### 2-2. 決済完了処理(`POST /payment/complete`)

フロントエンドは、Stripe決済ページからのリダイレクト後、URLパラメータ `?payment=success&session_id=...` を検知して本APIを呼び出す(`frontend/src/pages/MainView.jsx`)。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(MainView.jsx)
    participant API as routers/payment.py(/payment/complete)
    participant Stripe
    participant Service as services/checkout.py(place_order)
    participant DB as DB(carts, coupons, orders, order_items, products)
    participant Mail as email_utils(send_order_confirmation)

    Stripe->>顧客: 決済完了、success_urlへリダイレクト
    顧客->>Frontend: ?payment=success&session_id=xxx
    Frontend->>API: POST /payment/complete?session_id=xxx
    API->>Stripe: checkout.Session.retrieve(session_id)
    alt Stripe API呼び出し失敗
        Stripe-->>API: Exception
        API-->>Frontend: 400「決済セッションを確認できませんでした」
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
                API->>Service: place_order(user, coupon_code, status="processing", stripe_payment_intent_id, expected_total, expected_fingerprint)
                Service->>Service: 商品ID・数量・単価・coupon・合計を再計算
                alt 金額またはfingerprintがStripe Sessionと不一致
                    Service-->>API: CheckoutAmountMismatchError / CheckoutSnapshotMismatchError
                    API-->>Frontend: 409「決済時から注文内容が変更されたため、注文を確定できません」
                else 金額一致
                Service->>DB: Order・OrderItemを作成、在庫を減算、カートを削除、クーポン使用回数を加算
                DB-->>Service: コミット完了
                Service-->>API: Order
                API->>Mail: send_order_confirmation(注文情報)
                Mail-->>API: 送信完了(またはログ出力のみ)
                API-->>Frontend: 200 OrderOut
                Frontend->>顧客: 注文完了を表示
                end
            end
        end
    end
```

## 注文管理業務: 注文ステータスを更新する(管理者)

`PATCH /admin/orders/{order_id}/status`(`backend/app/routers/admin_orders.py`)に対応する。DB更新後にメール送信を行う多段処理のため、UC-002/UC-003と同様にシーケンス図を作成する。

```mermaid
sequenceDiagram
    actor 管理者
    participant Frontend as フロントエンド(AdminOrdersView)
    participant API as routers/admin_orders.py(/admin/orders/{id}/status)
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

`DELETE /users/me`(`backend/app/routers/users.py`)に対応する。パスワード検証・DB複数テーブル更新・匿名化前アドレスへのメール送信・フロントエンド側ログアウトという多段処理のため、他のUCと同様にシーケンス図を作成する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(ProfileView)
    participant API as routers/users.py(/users/me)
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

- メール送信(`send_account_deletion_email`)は、メールアドレスを匿名化する**前**に呼び出す(匿名化後では本人に届かないため)。この呼び出し順序は`routers/users.py`の実装上の制約であり、他のUC(注文確認メール等)とは異なりDB更新より先に実行する
- 注文履歴(`orders`/`order_items`)・レビュー(`reviews`)は本処理では更新・削除しない(UC-005備考、NFR-013参照)

## UC-006: 注文をキャンセルする(2026-07-11追加)

`POST /orders/{order_id}/cancel`(`backend/app/routers/orders.py`)に対応する。Stripe返金・在庫戻し・クーポン使用回数戻し・DB更新・メール送信という多段処理のため、他のUCと同様にシーケンス図を作成する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(OrderHistoryView)
    participant API as routers/orders.py(/orders/{id}/cancel)
    participant Service as services/order_actions.py(reverse_order)
    participant Stripe
    participant DB as DB(orders, order_items, products, coupons)
    participant Mail as email_utils(send_status_notification)

    顧客->>Frontend: 「キャンセルする」ボタン押下
    Frontend->>API: POST /orders/{id}/cancel
    API->>DB: 対象の注文を取得する(当該顧客のものか確認)
    alt 注文が存在しない/他人の注文
        DB-->>API: なし
        API-->>Frontend: 404「注文が見つかりません」
    else 注文が存在する
        DB-->>API: 注文
        alt ステータスがpending/processing以外
            API-->>Frontend: 400「発送済みの注文はキャンセルできません」
        else pending/processing
            API->>Service: reverse_order(order)
            opt stripe_payment_intent_idが設定されている
                Service->>Stripe: Refund.create(payment_intent)
                alt Stripe API呼び出し失敗
                    Stripe-->>Service: Exception
                    Service-->>API: HTTPException(500)
                    API-->>Frontend: 500「返金処理に失敗しました」
                else 返金成功
                    Stripe-->>Service: Refund
                end
            end
            Service->>DB: 在庫を注文数量分加算、クーポンused_countを1減算
            DB-->>Service: 反映完了
            Service-->>API: 完了
            API->>DB: statusをcancelledに更新
            DB-->>API: コミット完了
            API->>Mail: send_status_notification(注文者, 注文ID, "cancelled")
            Mail-->>API: 送信完了(またはログ出力のみ)
            API-->>Frontend: 200 OrderOut
            Frontend->>顧客: キャンセル完了を表示
        end
    end
```

## UC-007: 返品を申請する(2026-07-11追加)

`POST /orders/{order_id}/return-request`(`backend/app/routers/orders.py`)に対応する。単純なステータス更新+通知メール送信のみだが、UC-006・UC-008との一連の流れを示すため図示する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(OrderHistoryView)
    participant API as routers/orders.py(/orders/{id}/return-request)
    participant DB as DB(orders)
    participant Mail as email_utils(send_status_notification)

    顧客->>Frontend: 返品理由を入力し「返品を申請する」を選択
    Frontend->>API: POST /orders/{id}/return-request (reason)
    API->>DB: 対象の注文を取得する(当該顧客のものか確認)
    alt 注文が存在しない/他人の注文
        DB-->>API: なし
        API-->>Frontend: 404「注文が見つかりません」
    else 注文が存在する
        DB-->>API: 注文
        alt ステータスがshipped以外
            API-->>Frontend: 400「この注文は返品を申請できません」
        else shipped
            API->>DB: statusをreturn_requestedに更新、return_reasonを保存
            DB-->>API: コミット完了
            API->>Mail: send_status_notification(注文者, 注文ID, "return_requested")
            Mail-->>API: 送信完了(またはログ出力のみ)
            API-->>Frontend: 200 OrderOut
            Frontend->>顧客: 申請完了を表示
        end
    end
```

## UC-008: 返品を承認・却下する(管理者)(2026-07-11追加、2026-07-12 N-004反映)

`PATCH /admin/orders/{order_id}/return`(`backend/app/routers/admin_orders.py`)に対応する。承認/却下で処理が分岐し、承認時はUC-006と同様のStripe返金・在庫戻しを伴う多段処理のため図示する。却下時と承認時で送信するメール関数が異なる(N-004、`04_notification_design.md`参照)。

```mermaid
sequenceDiagram
    actor 管理者
    participant Frontend as フロントエンド(AdminOrdersView)
    participant API as routers/admin_orders.py(/admin/orders/{id}/return)
    participant Service as services/order_actions.py(reverse_order)
    participant Stripe
    participant DB as DB(orders, order_items, products, coupons)
    participant Mail as email_utils
    actor 顧客

    管理者->>Frontend: 「承認」または「却下」を選択
    Frontend->>API: PATCH /admin/orders/{id}/return (action)
    API->>DB: 対象の注文を取得する
    alt 注文が存在しない
        DB-->>API: なし
        API-->>Frontend: 404「注文が見つかりません」
    else 注文が存在する
        DB-->>API: 注文
        alt ステータスがreturn_requested以外
            API-->>Frontend: 400「この注文は返品申請中ではありません」
        else return_requested
            alt action == "reject"
                API->>DB: statusをshippedに更新
                DB-->>API: コミット完了
                API->>Mail: send_return_rejected_email(注文者, 注文ID)
                Mail->>顧客: 返品却下通知メールを送信する
            else action == "approve"
                API->>Service: reverse_order(order)
                opt stripe_payment_intent_idが設定されている
                    Service->>Stripe: Refund.create(payment_intent)
                    alt Stripe API呼び出し失敗
                        Stripe-->>Service: Exception
                        Service-->>API: HTTPException(500)
                        API-->>Frontend: 500「返金処理に失敗しました」
                    else 返金成功
                        Stripe-->>Service: Refund
                    end
                end
                Service->>DB: 在庫を注文数量分加算、クーポンused_countを1減算
                DB-->>Service: 反映完了
                Service-->>API: 完了
                API->>DB: statusをreturnedに更新
                DB-->>API: コミット完了
                API->>Mail: send_status_notification(注文者, 注文ID, "returned")
                Mail->>顧客: ステータス変更通知メールを送信する
            end
            API-->>Frontend: 200 OrderOut
            Frontend->>管理者: 更新完了を表示する
        end
    end
```

- 却下時は在庫・クーポン使用回数・返金処理を行わない(UC-008備考参照)
- 却下時に送信するメールは`send_status_notification`ではなく`send_return_rejected_email`(N-004): ステータスが`return_requested`→`shipped`に戻るため、汎用のステータス変更通知では顧客に「発送済み」という誤解を招く文面になってしまうことへの対応(`04_notification_design.md`参照)

## 商品管理業務: 低在庫アラートを確認する(管理者)(2026-07-12追加)

`GET /admin/products/low-stock`(`backend/app/routers/admin_products.py`、F-034)に対応する。DB検索のみで完結する単純な処理だが、S-101(商品管理画面)・S-104(ダッシュボード画面)の両方から呼び出される共通処理のため図示する。

```mermaid
sequenceDiagram
    actor 管理者
    participant Frontend as フロントエンド(AdminProductsView / AdminDashboardView)
    participant API as routers/admin_products.py(/admin/products/low-stock)
    participant DB as DB(products)

    管理者->>Frontend: 商品管理画面またはダッシュボードを開く
    Frontend->>API: GET /admin/products/low-stock
    API->>DB: low_stock_thresholdがNULLでなく、stock <= low_stock_thresholdの商品を取得する
    DB-->>API: 商品一覧(0件の場合もある)
    API-->>Frontend: 200 ProductOutの配列
    Frontend->>管理者: 低在庫の商品をバッジ/アラートセクションに表示する(0件の場合は「現在低在庫の商品はありません」)
```

- しきい値(`low_stock_threshold`)自体の設定・変更は既存の`POST /admin/products` / `PATCH /admin/products/{id}`(F-020/F-021)のリクエストボディに項目が1つ増えるのみで、別シーケンスは起こさない

## クーポン管理業務: クーポン残数アラートを確認する(管理者)(2026-07-13追加)

`GET /admin/coupons/low-remaining-uses`(`backend/app/routers/admin_coupons.py`、F-035)に対応する。低在庫アラートと同型のDB検索のみで完結する単純な処理だが、S-102(クーポン管理画面)・S-104(ダッシュボード画面)の両方から呼び出される共通処理のため図示する。

```mermaid
sequenceDiagram
    actor 管理者
    participant Frontend as フロントエンド(AdminCouponsView / AdminDashboardView)
    participant API as routers/admin_coupons.py(/admin/coupons/low-remaining-uses)
    participant DB as DB(coupons)

    管理者->>Frontend: クーポン管理画面またはダッシュボードを開く
    Frontend->>API: GET /admin/coupons/low-remaining-uses
    API->>DB: max_usesとlow_remaining_uses_thresholdが共にNULLでなく、(max_uses - used_count) <= low_remaining_uses_thresholdのクーポンを取得する
    DB-->>API: クーポン一覧(0件の場合もある)
    API-->>Frontend: 200 CouponOutの配列
    Frontend->>管理者: 残数僅少のクーポンをバッジ/アラートセクションに表示する(0件の場合は「残数僅少のクーポンはありません」)
```

- しきい値(`low_remaining_uses_threshold`)自体の設定・変更は、クーポン発行時(`POST /admin/coupons`、F-023)、または既存の`PATCH /admin/coupons/{id}`(F-024)のリクエストボディに項目が加わる形で行い、別シーケンスは起こさない

## UC-009: パスワードをリセットする(2026-07-13追加)

`POST /auth/password-reset/request`・`POST /auth/password-reset/confirm`(`backend/app/routers/users.py`、F-036)に対応する。要求・確定の2段階に分かれ、メールアドレスの存在有無を開示しないための分岐があるため、シーケンス図を作成する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(AuthView)
    participant API as routers/users.py(/auth/password-reset)
    participant DB as DB(users)
    participant Mail as email_utils(send_password_reset_email)

    顧客->>Frontend: 「パスワードをお忘れですか?」→メールアドレス入力→確定
    Frontend->>API: POST /auth/password-reset/request (email)
    API->>DB: emailに一致し、is_active=trueのユーザーを検索する
    alt 該当ユーザーが存在する
        API->>DB: password_reset_token(ランダム値)・password_reset_token_expires_at(現在時刻+24時間)を保存する
        DB-->>API: コミット完了
        API->>Mail: send_password_reset_email(email, reset_link)
        Mail-->>API: 送信完了(またはログ出力のみ)
    else 該当ユーザーが存在しない
        Note over API: 何もしない(トークン発行・メール送信をスキップ)
    end
    API-->>Frontend: 200(いずれの場合も同一レスポンス)
    Frontend->>顧客: 「メールを送信しました」を表示する

    顧客->>Frontend: メール内のリンクを開く→新しいパスワードを入力→確定
    Frontend->>API: POST /auth/password-reset/confirm (token, new_password)
    API->>DB: password_reset_tokenが一致し、password_reset_token_expires_atが現在時刻より後のユーザーを検索する
    alt トークンが無効・期限切れ
        API-->>Frontend: 400「リンクが無効です。再度お手続きください」
    else トークンが有効
        API->>DB: hashed_passwordを新しい値に更新し、password_reset_token・password_reset_token_expires_atをNULLにクリアする
        DB-->>API: コミット完了
        API-->>Frontend: 200
        Frontend->>顧客: 「パスワードを更新しました」を表示し、ログイン画面に遷移する
    end
```

- 要求(`request`)ステップは、該当ユーザーの有無に関わらず必ず200を返し、処理時間・レスポンス内容にも意図的な差異を設けない(ユーザー列挙攻撃対策、UC-009参照)
- 確定(`confirm`)ステップの成功時、`password_reset_token`をNULLにクリアすることでトークンを1回限りの使用に制限する
- パスワードリセット成功後も、それ以前に発行済みのJWTアクセストークンは個別には失効しない(本システムのJWTの制約。UC-009備考参照)

## UC-010: メールアドレスの本人確認を行う(2026-07-13追加)

`POST /auth/register`(確認メール送信部分)・`POST /auth/verify-email/resend`・`POST /auth/verify-email/confirm`(`backend/app/routers/users.py`、F-037)に対応する。確認リンクのクリックがフォーム入力を伴わず、アプリ起動時に自動的に確認APIを呼び出す点が他のUCと異なるため、シーケンス図で明示する。

```mermaid
sequenceDiagram
    actor 顧客
    participant Frontend as フロントエンド(AuthView / ProfileView / MainView)
    participant API as routers/users.py(/auth/register, /auth/verify-email)
    participant DB as DB(users)
    participant Mail as email_utils(send_verification_email)

    顧客->>Frontend: 会員登録する(既存フロー)
    Frontend->>API: POST /auth/register (email, password)
    API->>DB: usersにis_verified=falseでレコードを作成する
    API->>DB: email_verification_token(ランダム値)・email_verification_token_expires_at(現在時刻+7日)を保存する
    DB-->>API: コミット完了
    API->>Mail: send_verification_email(email, verify_link)
    Mail-->>API: 送信完了(またはログ出力のみ)
    API-->>Frontend: 201 UserOut(is_verified=false)

    opt 顧客がメールを見つけられない場合(代替フロー)
        顧客->>Frontend: プロフィール画面で「確認メールを再送する」
        Frontend->>API: POST /auth/verify-email/resend (Bearerトークン)
        API->>DB: email_verification_token・有効期限を新しい値で上書きする
        API->>Mail: send_verification_email(email, verify_link)
        API-->>Frontend: 200
    end

    顧客->>Frontend: 確認メール内のリンク(?verify_token=...)を開く
    Frontend->>Frontend: アプリ起動時にクエリパラメータを検知する(フォーム入力なし)
    Frontend->>API: POST /auth/verify-email/confirm (token)
    API->>DB: email_verification_tokenが一致し、email_verification_token_expires_atが現在時刻より後のユーザーを検索する
    alt トークンが無効・期限切れ
        API-->>Frontend: 400「リンクが無効です。再度お手続きください」
        Frontend->>顧客: トースト通知でエラーを表示する
    else トークンが有効
        API->>DB: is_verified=trueに更新し、email_verification_token・email_verification_token_expires_atをNULLにクリアする
        DB-->>API: コミット完了
        API-->>Frontend: 200
        Frontend->>顧客: トースト通知で「メールアドレスを確認しました」を表示する
    end
```

- メールアドレスが未確認(`is_verified=false`)であっても、本シーケンス以外の既存フロー(ログイン・注文等)は一切変更せず、制限も加えない(非ブロッキング設計、UC-010備考参照)
- 確認リンクのクリックはフォーム入力を伴わないため、既存のStripe決済完了時の`?payment=success`クエリパラメータ処理と同じ仕組み(`MainView`のマウント時副作用)を流用する

## 補足: UC-002とUC-003の内部処理の違い

- UC-003(`POST /orders`)とUC-002(`POST /payment/checkout` / `POST /payment/complete`)は、共通checkout serviceを利用し、無効または使用上限到達のクーポンを400で拒否する。
- 注文の`status`は、UC-003では`"pending"`、UC-002では`"processing"`となる(コードの実装差異をそのまま記載)。
