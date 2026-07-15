# CI/CD・DevSecOps ToBe 設計テンプレート

## 1. 目的と位置付け

- 対象工程、利用者、到達状態、元になった文書を記載する
- ローカル開発、デプロイ、セキュリティ、検証、運用との正本境界を明記する
- 監査基準日を明記し、GitHubのplan・visibility・外部機能は導入時に再確認する

## 2. 設計原則

PR中心、最小権限、信頼境界、build-once、短命credential、再現性、期限付き例外、採用済みの配布制約を扱う。

## 3. 現状評価

- `定義済み`、`実行確認済み`、`merge/deploy gate有効`を区別する
- リポジトリ内で確認できないGitHub側設定を推測しない
- 継続利用する基盤、差分、優先度、根拠ファイルを記載する

## 4. 目標パイプライン

- PR CI、main/release build、staging検証、production承認・migration・deploy・事後確認を示す
- 未実装checkを先にrequired化しない導入順序を定義する
- artifactのtrusted source、provenance検証、digest、昇格条件を定義する

## 5. リポジトリ統制

ruleset、required checks、review、CODEOWNERS、bypass、force push、security機能と設定証跡を扱う。

## 6. セキュリティとサプライチェーン

SAST、SCA、secret、Action固定、permissions、untrusted input、artifact、SBOM/provenance、DAST、IaC、脆弱性SLAを扱う。

## 7. 成果物・証跡・可観測性

CI診断artifact、release記録、health、log、metrics、trace、audit event、deploy marker、保持・マスキングを扱う。

## 8. 導入ロードマップ

- 外部機能の利用可否確認を最初に行う
- 現行checkの保護、新checkの導入・安定化、required化を段階的に行う
- production基盤未決定の項目を条件付きPhaseへ分離する
- 各Phaseに検証可能な完了条件を記載する

## 9. 非目標と判断保留

現時点で採用しないもの、導入条件、決定責任を記載する。

## 10. 完了条件

CIとCDを分け、merge制御、security gate、artifact真正性、migration、環境分離、承認、事後検証をチェックリスト化する。

## 11. 参考資料

公式仕様、公式ドキュメント、公開標準を優先し、監査基準日または再確認条件を明記する。
