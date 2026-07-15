# ADR-003: コンテナを開発・本番の実行方式として採用し、本番はAWS ECS Fargate + Terraformで管理する

- **状態**: Proposed
- **決定日**: 2026-07-15
- **決定者**: プロジェクト所有者

## コンテキスト

[デプロイ・構成設計](../02_deployment_design.md)はproductionの配布方式を未決定とし、host、region、frontend配信方式などの決定を本番化ゲートの先頭に置いている。学習目的でAWSへのデプロイを行うにあたり、配布方式(コンテナ化の可否)、クラウド基盤、IaCツールを決める必要があった。

また[開発環境ToBe設計](../04_development_environment_tobe.md)はこれまで開発・検証経路でのコンテナ不採用を定め、[CI/CD・DevSecOps ToBe設計](../05_cicd_devsecops_tobe.md)は「コンテナ採用はADRによる別決定とする」としていた。本番のコンテナ化を決める本ADRが、その別決定にあたる。

## 検討した選択肢

- **EC2へ直接配置(uvicornをホストプロセスで起動)**: 最安で、従来のホストプロセス方針とも一貫していた。一方でAMI・OSパッチ・process supervisorの管理が必要になり、構成がコード化されず手作業が残りやすい
- **コンテナ化 + ECS Fargate**: 実行環境をイメージとして固定でき、OS管理が不要。業界標準の構成でTerraform資産・事例も豊富。ALB等の周辺リソースでEC2案より月額コストは高い
- **コンテナ化 + App Runner**: 最も少ない構成要素で動くが、VPC統合やきめ細かい制御に制約があり、学習題材としてネットワーク層が隠蔽される
- **IaC: CloudFormation(YAML)**: AWS純正だがAWS専用。TerraformはHCLで記述し、state管理・plan差分の運用を学べ、事実上の業界標準

## 決定

本番配布方式をコンテナ化とし、AWS ECS Fargateで実行する。frontendはビルド成果物をS3 + CloudFrontで静的配信し、コンテナ化の対象はbackend(FastAPI)のみとする。インフラはTerraform(HCL)で宣言的に管理する。目標構成の詳細は[AWSデプロイToBe設計](../06_aws_deployment_tobe.md)を正本とする。

あわせて開発環境でもコンテナを採用する方針へ転換する。ローカル開発はDocker Composeでbackend(本番と同系のDockerfile)とPostgreSQLを起動し、本番との実行環境差を縮める。従来のコンテナ不採用方針は本ADRで撤回し、[開発環境ToBe設計](../04_development_environment_tobe.md)を本方針に合わせて改訂する。移行手順・`.tools/`方式との併用期間は同書のロードマップで管理する。

学習目的であることから、ネットワーク境界・TLS終端・シークレット管理を省略しない標準構成を優先し、コスト最小化のための構成簡略化(可用性の削減)は許容する。

## 影響

- backend用Dockerfileとイメージレジストリ(ECR)、および`infra/`配下のTerraform構成を新規に導入する
- 開発環境ToBe設計のコンテナ不採用方針(目的・非目標・受け入れ基準)を改訂し、bootstrap・Makefile・CIをコンテナ前提へ段階移行する。移行完了までは`.tools/`のホストプロセス方式が現行の実装であり続ける
- ローカルDBがSQLiteからPostgreSQL(コンテナ)へ移行するため、versioned migration(Alembic等)の導入が先行課題になる
- 本番DBはRDS(PostgreSQL)を前提とするため、[02_deployment_design.md](../02_deployment_design.md)本番化ゲートのversioned migration(Alembic等)導入が先行課題になる
- ALB・NAT等の常時課金リソースが発生する。コスト上限を超える場合はApp Runner等への再検討条件とする
