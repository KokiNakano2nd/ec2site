# バックアップ・復元設計

## 1. 現状と目標

現行のローカルSQLite DBは`backend/app/data/ec_site.db`にあり、自動バックアップ、暗号化保管、復元演習はない。開発ホスト上にファイルが存在するだけではバックアップにならない。永続データ運用前の暫定目標はRPO 24時間、RTO 4時間(NFR-026)とする。

## 2. 対象データ

| 対象 | 現状 | バックアップ方針 |
|---|---|---|
| アプリDB | SQLiteローカルファイル | 日次オンライン整合バックアップ。production DB決定後はDBネイティブ方式へ置換 |
| migration履歴 | 未導入 | 導入後はコードと同じversion controlで保持 |
| 構成 | 一部環境変数 | 値ではなく定義・参照をversion control、秘密本体はSecret Manager側で復旧可能にする |
| 商品画像 | 現在URLのみ | 外部ストレージ採用時にobject versioning/backupを定義 |
| ログ | 標準出力のみ | 保持期間・検索・改ざん耐性をproduction設計で決定 |
| Stripeデータ | Stripe管理 | 自システムのバックアップ対象外。IDをDBと照合可能にする |

## 3. SQLite期間の暫定手順

単なる稼働中DBファイルのコピーは整合性を保証しない。SQLiteのbackup APIまたは`sqlite3 .backup`を使い、一貫したスナップショットを作成する。自動化スクリプトはまだ存在しないため、次は設計手順であり運用開始済みではない。

1. バックアップ先がDBと異なる障害ドメインで、アクセス制限・暗号化・空き容量を満たすことを確認
2. UTC時刻、アプリversion、schema versionをmanifestへ記録
3. SQLiteオンラインbackupを一時ファイルへ作成
4. `PRAGMA integrity_check`が`ok`であることを確認
5. 暗号化し、checksumとmanifestを保存
6. 成功/失敗を監視へ送り、失敗時は同日中に対応

production DB採用後は、この手順をそのまま流用せず、DBベンダーのpoint-in-time recoveryと整合スナップショットへ置換する。

## 4. 保持とアクセス

- 暫定保持: 日次7世代、週次4世代、月次12世代。法令・事業要件確定後に見直す
- backupはproduction書込権限と分離し、削除・復元権限を最小人数に限定する
- 個人データを含むため、転送時・保存時に暗号化し、アクセスを監査する
- 退会・削除要求とbackup内データの扱い、保持期限後の確実な削除をプライバシー方針に合わせる

## 5. 復元演習

1. productionから隔離した空の環境を用意する
2. 対象backupとchecksum、manifestを検証する
3. DBを復元し、migration適用versionとアプリversionを合わせる
4. integrity checkを実行する
5. 件数、代表注文の明細/金額/在庫/クーポン、匿名化済みユーザーを照合する
6. アプリのスモークテストを実行する。Stripe/SMTP実送信は禁止
7. RPO/RTO、失敗、手動操作、改善事項を記録する

復元演習はproduction開始前と、その後少なくとも四半期ごと、DB方式・暗号鍵・手順変更後に行う。backupジョブ成功だけでは適合としない。

## 6. 災害シナリオ

| シナリオ | 復旧方針 | 注意 |
|---|---|---|
| DB破損/誤削除 | 影響操作停止→最新の正常backup/PITR→整合照合 | Stripe側決済との差分を別途照合 |
| application rollback | DB schema互換性を確認してartifactを戻す | destructive migration後の単純rollback禁止 |
| 秘密漏えい | 秘密をローテーションし影響調査 | backup暗号鍵漏えい時は全世代を評価 |
| リージョン/ホスト喪失 | 別障害ドメインのbackupから再構築 | 現行ローカル構成では未対応 |
