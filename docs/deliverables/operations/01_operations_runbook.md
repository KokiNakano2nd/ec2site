# 運用Runbook

## 1. 適用範囲

現時点で実行可能なのはローカルDocker Compose環境だけである。本書前半はローカル環境の実手順、後半はproduction導入時に埋める運用ゲートを扱う。存在しない監視基盤、オンコール体制、クラウド操作を実装済みとは記載しない。

## 2. ローカル起動・停止

### 起動前確認

1. 作業ディレクトリがリポジトリルートであることを確認する
2. `docker-compose.yml`が開発用シークレット、bind mount、reloadを使うことを理解し、外部公開しない
3. Stripe/SMTPを利用する場合は秘密をリポジトリやshell履歴へ直接書かず、ローカル専用の安全な方法で注入する

```bash
docker compose up --build
```

期待結果:

- frontend: `http://localhost:5174`
- backend OpenAPI UI: `http://localhost:8001/docs`
- backend OpenAPI JSON: `http://localhost:8001/openapi.json`

専用のliveness/readiness endpointは未実装である。`/openapi.json`の200はプロセス到達性しか保証せず、DB・Stripe・SMTPの健全性を表さない。

### 停止

通常停止は`Ctrl+C`後に次を実行する。

```bash
docker compose down
```

`docker compose down -v`やDBファイル削除はデータ消失につながるため、本Runbookの通常停止では使用しない。

## 3. 開発環境の基本診断

| 症状 | 確認 | 判断・次の対応 |
|---|---|---|
| frontendが開かない | frontend containerログ、5174 port競合 | build/依存/portを確認。DB操作はしない |
| APIが応答しない | backend containerログ、8001 port、`/openapi.json` | import/config/portを確認 |
| 500が返る | traceback、直前操作、DBファイル権限 | 再現手順を保存し、安易にDBを初期化しない |
| ログイン不可 | `/auth/login`のstatus、429、ユーザー状態 | レート制限、資格情報、`is_active`を区別 |
| Stripe不可 | `/config`、キー設定、Stripe例外ログ | 未設定と外部障害を区別。カードなし注文への影響を確認 |
| メール未着 | SMTP設定と送信ログ | SMTP未設定時は標準出力であり配送されない |
| 画面とAPIが不一致 | `VITE_API_URL`、CORS origin | frontend URLとbackend CORSの構成差を確認 |

## 4. 障害時の証拠保全

- 発生/検知時刻、利用者影響、直前の変更、HTTP method/path/statusを記録する
- 注文ID、Stripe Session/Payment Intent IDは必要最小限だけ記録し、アクセストークン、パスワード、カード情報を記録しない
- ログを共有する前にメール、住所、電話、reset/verification tokenをマスクする
- 二重課金・返金・データ消失が疑われる場合、追加操作を止めて証拠を保存する。DBを初期化しない

## 5. インシデント重大度と初動

| 重大度 | 例 | 初動 |
|---|---|---|
| Sev-1 | 情報漏えい、二重課金、広範なデータ消失 | 影響操作を停止、秘密ローテーション/決済停止を検討、所有者へ即時連絡、証拠保全 |
| Sev-2 | 注文不能、管理者認可不備、在庫/金額不整合 | 該当機能を停止または回避策提示、当日中に原因切り分け |
| Sev-3 | 限定機能障害、代替手段あり | issue化し優先順位を判断 |
| Sev-4 | 文言・軽微な表示 | 通常バックログ |

現状は個人プロジェクトで24時間オンコールを設けない。本番化時には連絡先、応答時間、権限委譲、Stripe/ホスティング事業者への連絡経路を決定する。

## 6. 復旧後

1. 利用者影響とデータ整合性を確認する
2. 注文・在庫・クーポン・返金を照合する
3. 修正後に対象テストと回帰テストを実行する
4. タイムライン、根本原因、検知できなかった理由、再発防止、担当・期限を記録する
5. Runbook、監視、テスト、設計書の不足を同じ変更で更新する

## 7. production運用ゲート

- liveness/readiness/startup probeを分離し、依存先を含む判定方針を決める
- 権限付き管理経路、監視、アラート、ログ保管、相関IDを導入する
- 定期バックアップと復元演習を行う
- DB migrationとリリース/rollback手順を実装する
- Stripe Webhook障害、メール滞留、決済済み未確定注文の照合Runbookを追加する
- 最終演習日、実施者、結果をRunbookに記録する
