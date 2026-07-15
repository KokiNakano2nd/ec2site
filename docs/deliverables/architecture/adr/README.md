# Architecture Decision Records

横断的で長期に影響する設計判断を、背景・代替案・結果とともに記録する。状態は`Proposed`、`Accepted`、`Superseded`、`Deprecated`のいずれかとし、置換時は旧ADRを削除せず相互リンクする。

| ADR | 状態 | 決定 |
|---|---|---|
| [ADR-001](ADR-001-openapi-source-of-truth.md) | Accepted | API仕様の機械可読な正本をFastAPI生成OpenAPIとする |
| [ADR-002](ADR-002-argon2id-password-migration.md) | Accepted | Argon2idへログイン時段階移行する |
| [ADR-003](ADR-003-aws-container-deployment.md) | Proposed | 本番配布方式をAWS ECS Fargate(コンテナ)とし、IaCをTerraformで管理する |
