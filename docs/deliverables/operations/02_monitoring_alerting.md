# 監視・アラート設計

## 1. 現状

アプリケーションはPython標準loggingによる標準出力ログを持つが、メトリクス、分散トレース、集中ログ、外形監視、通知先は未実装である。以下はproduction導入時の要求であり、現行環境で稼働中とは扱わない。

## 2. 観測信号

| 種別 | 必須信号 | 個人情報上の制約 |
|---|---|---|
| 外形監視 | 顧客画面、API readiness、主要な非破壊フロー | 実顧客データを使わない |
| メトリクス | request count/latency/status、DB接続、外部API結果、業務不整合件数 | email、token、住所をlabelにしない |
| ログ | 時刻、severity、event、request/correlation ID、結果、必要最小限のresource ID | 秘密、JWT、reset token、カード情報を禁止 |
| トレース | frontend/API/DB/Stripe/SMTP境界の所要時間 | payload本文を原則収集しない |

## 3. アラート候補

しきい値は暫定であり、staging負荷試験と運用実績で調整する。

| ID | 条件 | 集計窓 | 重大度 | 初動 |
|---|---|---|---|---|
| ALT-001 | API 5xx率 > 5%かつ20件以上 | 5分 | critical | RunbookのAPI障害。直近deployとDBを確認 |
| ALT-002 | API p95 > 3秒 | 15分 | warning | path別遅延、DB、外部APIを確認 |
| ALT-003 | Stripe Checkout/取得/返金の失敗が3件以上 | 5分 | critical | Stripe status、key、対象注文を確認。二重実行禁止 |
| ALT-004 | 決済成功イベントに対応する注文が5分以内に確定しない | 5分 | critical | Webhook/冪等台帳を照合し手動確定前に再送確認 |
| ALT-005 | SMTP失敗が5件以上 | 15分 | warning | SMTP status/資格情報。注文自体の成否と分離 |
| ALT-006 | バックアップ未完了または復元検証失敗 | 24時間 | critical | 次回処理を待たず運用担当へ通知 |
| ALT-007 | 401/403/429が基準値から急増 | 15分 | warning | 攻撃、誤設定、利用者障害を切り分け |
| ALT-008 | DB容量 > 80%または接続取得失敗 | 10分 | critical | 容量・接続・直近migrationを確認 |

## 4. 通知・抑止

- production通知先と担当者は未決定。導入時にprimary/secondaryと営業時間外方針を定める
- 同一原因のアラートは集約し、復旧通知を送る
- maintenance windowでは計画対象だけを抑止し、セキュリティ・データ整合性アラートは原則抑止しない
- アラートにはダッシュボード、Runbook、開始時刻、環境、直近deployへのリンクを付ける

## 5. 検証

- stagingで各criticalアラートを少なくともリリース前に1回発報する
- 四半期ごとに通知到達、権限、Runbookの有効性を確認する
- 誤検知、見逃し、対応不能なアラートをレビューし、しきい値または信号を修正する
- テスト結果を将来`verification/evidence/monitoring/`へ保存する
