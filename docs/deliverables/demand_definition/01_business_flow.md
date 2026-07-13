# 業務フロー図

記載ルールは `docs/templates/demand_definition/business_flow_template.md`(UMLアクティビティ図)を参照。

対象は、商品閲覧を含む商品購入業務、および2026-07-06に追加した8業務(会員管理・お気に入り・レビュー投稿・配送先管理・商品管理・クーポン管理・注文管理・売上分析)の計9業務。個別の業務フロー図は業務ごとに`business_flow/`配下のファイルへ分離した(1業務=1ファイル)。本ファイルは業務一覧の概要とリンク集を提供する。

| 業務 | 概要 | As-Is | 詳細 |
|---|---|---|---|
| 商品購入業務 | 顧客が商品を検索・閲覧し、カートに追加し、クーポンを適用した上で注文を確定、決済を完了するまでの業務。 | あり | [01_product_purchase.md](business_flow/01_product_purchase.md) |
| 会員管理業務 | 顧客がアカウントを登録し、ログインしてシステムを利用できるようにする業務。 | 該当なし | [02_membership.md](business_flow/02_membership.md) |
| お気に入り管理業務 | 顧客が気になる商品をお気に入り登録し、後で見返せるようにする業務。 | 該当なし | [03_favorites.md](business_flow/03_favorites.md) |
| レビュー投稿業務 | 顧客が購入検討中・購入済みの商品にレビュー(評価・コメント)を投稿し、他の顧客の購入判断材料にする業務。 | 該当なし | [04_review.md](business_flow/04_review.md) |
| 配送先管理業務(顧客向け) | 顧客が配送先住所を登録・編集し、デフォルトの配送先を設定する業務。 | 該当なし | [05_address.md](business_flow/05_address.md) |
| 商品管理業務(管理者向け) | 管理者が商品情報(商品本体・商品画像)を登録・編集・削除する業務。 | 該当なし | [06_product_admin.md](business_flow/06_product_admin.md) |
| クーポン管理業務(管理者向け) | 管理者がクーポン(割引コード)を発行・有効化/無効化・削除する業務。 | 該当なし | [07_coupon_admin.md](business_flow/07_coupon_admin.md) |
| 注文管理業務(管理者向け) | 管理者が全顧客の注文一覧を確認し、注文状況(ステータス)を更新する業務。 | 該当なし | [08_order_admin.md](business_flow/08_order_admin.md) |
| 売上分析業務(管理者向け) | 管理者が売上サマリー・日別売上推移・売れ筋商品・カテゴリ別売上を確認する業務。 | 該当なし | [09_sales_analytics.md](business_flow/09_sales_analytics.md) |

- 商品購入業務のTo-Beフローは、決済方法として「Stripeによるカード決済」と「カード決済を使わない即時確定」の2経路を持つ(該当ユースケース: UC-002, UC-003)。詳細は[business_flow/01_product_purchase.md](business_flow/01_product_purchase.md)を参照。
- As-Isが「該当なし」の業務は、(a) ECサイト固有でありAs-Is業務フロー自体が存在しない、または (b) 業務エキスパートへのヒアリングを行っておらず確認できていない、のいずれかであることを各ファイル内に明記している。
