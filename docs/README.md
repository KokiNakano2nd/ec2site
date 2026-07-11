# ドキュメント全体ルール

このファイルは `docs/` 配下のすべてのドキュメント(要求定義・要件定義・外部設計・内部設計、およびそれぞれの `templates/`・`deliverables/`)に共通するルールをまとめたものです。個別フェーズのテンプレートに記載されているルールより優先されます。

## 1. フォルダ構成

- `docs/templates/<phase>/` : 各フェーズのドキュメントを作成する際の共通ルール・記法テンプレート
- `docs/deliverables/<phase>/` : 上記テンプレートに従って作成した実ドキュメント

`<phase>` は `demand_definition`(要求定義) / `requirements`(要件定義) / `external_design`(外部設計) / `internal_design`(内部設計) の4種類。

## 2. 図の表記はUML記法で統一する(必須)

すべてのフェーズの図は、**UML(Unified Modeling Language)の記法**で表現する。特定の図の目的に応じて、以下のUML図種を使い分ける。**特に外部設計・内部設計フェーズ(設計書)では、図を新たに起こす際は必ず本ルールに従うこと。**

| 用途 | UML図種 | 使用するMermaid記法 | 備考 |
|---|---|---|---|
| 業務フロー図(`01_business_flow.md`) | アクティビティ図(Activity Diagram) | `flowchart` | Mermaidにアクティビティ図専用の記法がないため、`flowchart`の図形をUMLアクティビティ図のシンボル(開始/終了ノード、アクション、分岐、パーティション)に合わせて用いる近似表現 |
| 概念ER図(`04_conceptual_er.md`) | クラス図(Class Diagram)によるドメインモデル | `classDiagram` | crow's foot記法ではなく、UMLの多重度表記(`"1"`, `"0..*"`等)を用いる |
| 画面遷移図(`05_screen_list.md`) | 状態遷移図(State Machine Diagram) | `stateDiagram-v2` | 画面を状態、画面遷移操作をイベント/ガードとして表現する。Mermaidのネイティブ記法がそのままUML状態遷移図に対応する |
| 物理ER図(`01_table_definition.md`) | クラス図(Class Diagram) | `classDiagram` | 概念ER図と異なり、属性(カラム)・PK/FKを明示する |
| モジュール構成図(`02_module_design.md`) | パッケージ図(Package Diagram)相当 | `classDiagram`(`<<module>>`ステレオタイプ+依存矢印`..>`で近似) | Mermaidにパッケージ図専用の記法がないための近似表現 |
| シーケンス図(`03_sequence_diagram.md`) | シーケンス図(Sequence Diagram) | `sequenceDiagram` | Mermaidのネイティブ記法がそのままUMLシーケンス図に対応する |
| ドキュメント体系図(`document_map.md`) | アクティビティ図(Activity Diagram)のオブジェクトフロー | `flowchart` | 各ドキュメントをUMLオブジェクトノード(成果物)として捉え、「あるドキュメントの内容をインプットに次のドキュメントを作成する」という流れを、業務フロー図と同じ`flowchart`近似表現(オブジェクトノードは`[text]`、フェーズは`subgraph`によるパーティション)で表す |
| (今後、上記以外の図が必要になった場合) | 内容に応じてUML図種を選定する | 選定したUML図種に対応するMermaid記法 | 対応するUML図種を決めたら、この表に行を追記し、対応するテンプレートファイルに具体的な記法ルールを記載する |

- 参考文献: OMG, "Unified Modeling Language (UML) Specification", Version 2.5.1 — https://www.omg.org/spec/UML/2.5.1/
- 上記の対応関係は本ドキュメント全体のルールとして固定する。新しい種類の図を追加する場合も、まずUML図種のどれに対応するかを検討し、対応する図種がない場合はこの表に追記してから作成する
- 各フェーズのテンプレート(`business_flow_template.md`, `conceptual_er_template.md`, `screen_list_template.md`, および外部設計・内部設計フェーズの各テンプレート)には、この対応関係に基づいた具体的な記法ルールを記載する
- **設計書(外部設計書・内部設計書)を作成する際、UML表現が必要になった場合は、本ルールに従うことを必須とする。**独自記法・BPMN・crow's foot等、UML以外の記法を新たに導入しない

## 3. その他の共通ルール(既存)

- 業務エキスパートへのヒアリングが入力になっている場合は、その旨を明記する(「ヒアリングにより確認」等)
- 実ドキュメントは、実際のコードベース(`backend/`, `frontend/`)に基づいて作成する。想定と実装が異なる場合は、実装を優先し、訂正した旨を明記する
- URLを引用する際、確認が取れない・変更される可能性があるものは、その旨を明記し断定しない
- 各ドキュメントの項目には「元になったドキュメント」を明記し、トレーサビリティを確保する
