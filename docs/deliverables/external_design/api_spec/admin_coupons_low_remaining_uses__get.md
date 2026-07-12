# GET /admin/coupons/low-remaining-uses — 残数僅少のクーポン一覧を取得する

[← API仕様一覧に戻る](../02_api_spec.md)

**業務領域**: クーポン管理業務(管理者向け) / **リソース**: /admin/coupons/low-remaining-uses

**認証**: 必要(Bearerトークン + 管理者権限。`get_current_admin`、NFR-011参照)

**概要**: `low_remaining_uses_threshold`が設定済みで、かつ使用回数上限(`max_uses`)が設定済みで、残り使用回数(`max_uses - used_count`)がしきい値以下のクーポンの一覧を取得する(S-102, S-104)
**元になった機能**: F-035

**リクエスト**: なし

**レスポンス(200)**: クーポンオブジェクトの配列(`GET /admin/coupons`の要素と同一形式)。`low_remaining_uses_threshold`が未設定(NULL)のクーポン、`max_uses`が無制限(NULL)のクーポンは含まれない

**エラーレスポンス**: なし
