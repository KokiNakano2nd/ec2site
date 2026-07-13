# ADR-001: API仕様の正本をFastAPI生成OpenAPIとする

- **状態**: Accepted
- **決定日**: 2026-07-13
- **決定者**: プロジェクト所有者

## コンテキスト

Markdown API仕様が人手管理され、実装54操作に対し51件しか存在せず、共通401/403/422も欠落していた。

## 検討した選択肢

- Markdownのみ: 読みやすいが機械的な完全性検証が難しい
- 手書きOpenAPI: 設計先行に向くが、現行コードとの二重管理が残る
- FastAPI生成OpenAPI + Markdown補足: 実装面を自動生成し、業務説明だけ人手管理できる

## 決定

`external_design/openapi.json`を機械可読な正本とし、FastAPIから生成する。`02_api_spec.md`と個別Markdownは機能ID・業務エラーの補足とする。CIで生成物との差分を検知する。

## 影響

- ルート・Pydantic変更時はOpenAPI再生成が必要
- API設計を実装より先に変更する場合も、最終的にFastAPIメタデータへ反映する必要がある
- Markdownへの型情報の重複記載を段階的に減らす
