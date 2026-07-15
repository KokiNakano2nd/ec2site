# ドキュメント全体ルール

このファイルは `docs/` 配下のすべてのドキュメント(要求定義・要件定義・アーキテクチャ・外部設計・内部設計・検証・運用、および各`templates/`・`deliverables/`)に共通するルールをまとめたものです。個別フェーズのテンプレートに記載されているルールより優先されます。

## 1. フォルダ構成

- `docs/templates/<phase>/` : 各フェーズのドキュメントを作成する際の共通ルール・記法テンプレート
- `docs/deliverables/<phase>/` : 上記テンプレートに従って作成した実ドキュメント

`<phase>` は、既存の `demand_definition`(要求定義) / `requirements`(要件定義) / `external_design`(外部設計) / `internal_design`(内部設計) に加え、横断的な `architecture`(アーキテクチャ) / `verification`(検証) / `operations`(運用) を使用する。

### 1.1 成果物の入口

| 領域 | 主な成果物 |
|---|---|
| 要求・要件 | [システム要求](deliverables/requirements/00_system_requirements.md)、[業務フロー](deliverables/demand_definition/01_business_flow.md)、[User Story](deliverables/demand_definition/02_user_stories.md)、[機能一覧](deliverables/requirements/03_function_list.md)、[非機能要件](deliverables/requirements/06_nonfunctional_requirements.md) |
| アーキテクチャ | [概要](deliverables/architecture/01_architecture_overview.md)、[デプロイ](deliverables/architecture/02_deployment_design.md)、[セキュリティ・プライバシー](deliverables/architecture/03_security_privacy_design.md)、[開発環境ToBe](deliverables/architecture/04_development_environment_tobe.md)、[CI/CD・DevSecOps ToBe](deliverables/architecture/05_cicd_devsecops_tobe.md)、[AWSデプロイToBe](deliverables/architecture/06_aws_deployment_tobe.md)、[ADR一覧](deliverables/architecture/adr/README.md) |
| 外部・内部設計 | [画面設計](deliverables/external_design/01_screen_design.md)、[API仕様](deliverables/external_design/02_api_spec.md)、[外部IF](deliverables/external_design/03_external_interface.md)、[テーブル](deliverables/internal_design/01_table_definition.md)、[モジュール](deliverables/internal_design/02_module_design.md)、[エラー/トランザクション](deliverables/internal_design/04_error_handling_design.md) |
| 検証 | [トレーサビリティ](deliverables/verification/01_traceability_matrix.md)、[テスト計画](deliverables/verification/02_test_plan.md) |
| 運用 | [Runbook](deliverables/operations/01_operations_runbook.md)、[監視](deliverables/operations/02_monitoring_alerting.md)、[バックアップ/復元](deliverables/operations/03_backup_restore.md)、[リリース/移行](deliverables/operations/04_release_migration.md) |
| 体系 | [ドキュメント体系図](document_map.md) |

## 2. 図は目的に適した公開標準・定着した記法を使う

UMLへ一律に寄せることを目的にせず、読み手の関心事と図の目的に最も適した記法を選ぶ。既存図を理由なく書き換える必要はないが、新規図は次の対応を標準とし、タイトル、スコープ、凡例、関係の意味を明記する。

| 用途 | UML図種 | 使用するMermaid記法 | 備考 |
|---|---|---|---|
| 業務フロー図(`01_business_flow.md`) | アクティビティ図(Activity Diagram) | `flowchart` | Mermaidにアクティビティ図専用の記法がないため、`flowchart`の図形をUMLアクティビティ図のシンボル(開始/終了ノード、アクション、分岐、パーティション)に合わせて用いる近似表現 |
| 概念ER図(`04_conceptual_er.md`) | クラス図(Class Diagram)によるドメインモデル | `classDiagram` | crow's foot記法ではなく、UMLの多重度表記(`"1"`, `"0..*"`等)を用いる |
| 画面遷移図(`05_screen_list.md`) | 状態遷移図(State Machine Diagram) | `stateDiagram-v2` | 画面を状態、画面遷移操作をイベント/ガードとして表現する。Mermaidのネイティブ記法がそのままUML状態遷移図に対応する |
| 物理ER図(`01_table_definition.md`) | クラス図(Class Diagram) | `classDiagram` | 概念ER図と異なり、属性(カラム)・PK/FKを明示する |
| モジュール構成図(`02_module_design.md`) | パッケージ図(Package Diagram)相当 | `classDiagram`(`<<module>>`ステレオタイプ+依存矢印`..>`で近似) | Mermaidにパッケージ図専用の記法がないための近似表現 |
| シーケンス図(`03_sequence_diagram.md`) | シーケンス図(Sequence Diagram) | `sequenceDiagram` | Mermaidのネイティブ記法がそのままUMLシーケンス図に対応する |
| ドキュメント体系図(`document_map.md`) | アクティビティ図(Activity Diagram)のオブジェクトフロー | `flowchart` | 各ドキュメントをUMLオブジェクトノード(成果物)として捉え、「あるドキュメントの内容をインプットに次のドキュメントを作成する」という流れを、業務フロー図と同じ`flowchart`近似表現(オブジェクトノードは`[text]`、フェーズは`subgraph`によるパーティション)で表す |
| システムコンテキスト/コンテナ図 | C4 model | `flowchart` | 人、システム、コンテナ、技術、関係を明示する。小規模ではContextとContainerを基本とする |
| デプロイ図 | C4 DeploymentまたはUML Deployment | `flowchart` | 環境、実行ノード、コンテナ、ネットワーク、永続層を示す |
| 脅威モデル | Data Flow Diagram(DFD) | `flowchart` | プロセス、データストア、外部主体、データフロー、信頼境界を示す |
| (今後、上記以外の図が必要になった場合) | 内容に応じてUML図種を選定する | 選定したUML図種に対応するMermaid記法 | 対応するUML図種を決めたら、この表に行を追記し、対応するテンプレートファイルに具体的な記法ルールを記載する |

- 参考文献: OMG, "Unified Modeling Language (UML) Specification", Version 2.5.1 — https://www.omg.org/spec/UML/2.5.1/
- 新しい種類の図を追加する場合は、目的、対象読者、記法、凡例を決め、この表に追記する
- 各フェーズのテンプレート(`business_flow_template.md`, `conceptual_er_template.md`, `screen_list_template.md`, および外部設計・内部設計フェーズの各テンプレート)には、この対応関係に基づいた具体的な記法ルールを記載する
- 独自の箱・線・色へ意味を持たせる場合は必ず凡例を付ける。公開標準または広く定着した記法で目的を満たせる場合、独自記法を作らない

## 3. その他の共通ルール(既存)

- 業務エキスパートへのヒアリングが入力になっている場合は、その旨を明記する(「ヒアリングにより確認」等)
- 現状を説明するドキュメントは、実際のコードベース(`backend/`, `frontend/`)と一致させる。要求・設計・規約と実装が異なる場合は、実装へ無条件に文書を合わせず、文書の誤りか実装の未達・技術的負債かを判定して差異を明記する
- URLを引用する際、確認が取れない・変更される可能性があるものは、その旨を明記し断定しない
- 各ドキュメントの項目には「元になったドキュメント」を明記し、トレーサビリティを確保する

## 4. 新機能開発フロー(2026-07-11追加)

新機能を追加する際は、実装から着手せず、以下の順序で進める。退会機能(US-020, UC-005, F-030)を実施した際のフローを一般化したもの。

1. **候補出し**: 既存の機能一覧(`requirements/03_function_list.md`)と重複しない候補を挙げる
2. **スコープ決定**: 候補の中から着手するものを決める。既存ドキュメントが「今後の課題」として認識済みのギャップ(非機能要件の備考欄等)があれば優先候補になりやすい
3. **曖昧な設計判断の確認**: データの扱い(削除方式、既存データへの影響範囲等)や実行前の確認方法など、ドキュメントやコードだけでは決まらない業務判断は、要求定義に着手する前に確認する。ここを飛ばすと後続フェーズで手戻りが発生する
4. **要求定義**: 業務フロー図(`demand_definition/business_flow/`)を更新し、User Story(`demand_definition/user_stories/`)を追加する
5. **要件定義**: 複雑度に応じてユースケース化するか判断し(`requirements/use_cases/`)、機能一覧(`requirements/function_list/`)に追加する。概念ER・画面一覧・非機能要件など、既存ドキュメントへの波及がないか確認し反映する
6. **外部設計**: API仕様(`external_design/api_spec/`)・画面設計(`external_design/01_screen_design.md`)・通知設計(`external_design/04_notification_design.md`)など、影響するドキュメントを更新する。APIを変更した場合は`backend`で`uv run python scripts/export_openapi.py`を実行し、機械可読な正本`external_design/openapi.json`も更新する
7. **内部設計**: テーブル定義・モジュール設計・シーケンス図・エラーハンドリング設計(`internal_design/`)を更新する。実装時に判明した制約(処理順序等)は、後述の実装ステップ完了後にここへ書き戻す
8. **実装**: バックエンド→フロントエンドの順で実装する。着手前に、既存の類似機能(命名規則・エラーハンドリング方式)のコードを読んで実装パターンを合わせる
9. **検証設計・動作確認**: `verification/01_traceability_matrix.md`で要求から自動テストまでを対応付ける。正常系・異常系(バリデーションエラー、権限エラー等)をAPI経由で確認し、UI変更はブラウザでも確認する
10. **整合性チェック**: `document_map.md`を更新し、ファイル件数・派生関係表・比較監査記録等に更新漏れがないか確認する

- ステップ4〜7で「ドキュメントを全部書いてから実装する」のではなく、実装時に判明した詳細(呼び出し順序の制約等)を該当フェーズのドキュメントに書き戻す往復を許容する
- 本フローの具体例は`docs/document_map.md`「6. 新機能追加の例: 退会機能」を参照

## 5. コーディング規約(2026-07-13追加)

実装時の命名・設計・書き方の基準は `docs/coding_conventions/` にまとめる。要求定義〜内部設計の成果物(`deliverables/`)とは性質が異なるプロジェクト運営ルールのため、`document_map.md` の派生関係表には含めない。

規約は既存実装を正当化するための文書ではない。公式仕様・公開標準・プロジェクト要件を既存実装より優先し、差異は「例外」「移行対象」「要決定」として管理する。分類と改訂ルールは`coding_conventions/common.md` §0に従う。

- `docs/coding_conventions/common.md` : 言語非依存(命名・Git運用・コメント・セキュリティ・ログ等)
- `docs/coding_conventions/backend.md` : Python / FastAPI / SQLAlchemy / Pydantic
- `docs/coding_conventions/frontend.md` : JavaScript / React / Vite
- `docs/coding_conventions/testing.md` : pytest / Vitest / Playwright

ESLintとruffが機械的に検査しているルールは、設定ファイルを正とし、規約書へ設定値を不必要に重複記載しない。ruffによるPythonのformat checkはCIで実行する。frontendには現在Prettier本体およびformat checkを導入していないため、導入するまではPrettierによる自動強制を前提にしない。

規約違反を検出した場合、新規・変更コードは原則として同じ変更内で解消する。既存コード全体へ影響する場合は移行対象として記録し、安全に分離できる単位で別変更にする。
