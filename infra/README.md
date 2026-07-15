# infra

[ADR-003](../docs/deliverables/architecture/adr/ADR-003-aws-container-deployment.md)と[AWSデプロイToBe設計](../docs/deliverables/architecture/06_aws_deployment_tobe.md)に基づくTerraform(HCL)構成。Terraformの実行バイナリは`make bootstrap`が`.tools/bin/terraform`へ固定版を導入する。

```text
infra/
├── bootstrap/          # tfstateバケット + GitHub OIDCロール(一回限り、ローカルstate)
├── environments/
│   ├── staging/        # 環境ごとのroot module(backend設定・変数値)
│   └── production/
└── modules/
    ├── network/        # VPC、サブネット、NAT、ルートテーブル
    ├── database/       # RDS PostgreSQL(資格情報はRDS管理のSecrets Manager)
    ├── backend_app/    # ECR、ECS Fargate、ALB、アプリ用シークレット
    └── frontend/       # S3、CloudFront(OAC、/api/*→ALB転送)
```

## 適用手順(初回)

前提: AWSアカウントとAWS CLI認証情報(IAM Identity Center等)。すべての変更は`terraform plan`で差分を確認してからapplyする。

1. **bootstrap**: `infra/bootstrap/`で`terraform init && terraform apply`(`state_bucket_name`は`ec2site-tfstate-<account_id>`等のグローバル一意名)。出力の`state_bucket_name`を`environments/*/versions.tf`の`REPLACE_WITH_STATE_BUCKET_NAME`へ反映してコミットする。ローカルに生成される`terraform.tfstate`はコミットしない
2. **staging**: `infra/environments/staging/`で`terraform init`後、`terraform apply -var frontend_bucket_name=<一意名>`
3. **シークレット値の設定**: `terraform output app_secret_arns`の各シークレットへ`aws secretsmanager put-secret-value`で値を入れる(値はTerraform・Gitに置かない)。`DATABASE_URL`は`db_master_user_secret_arn`の資格情報と`db_endpoint`から`postgresql+psycopg://...`を組み立てる
4. **イメージとfrontendの配置**: backendイメージ(git SHAタグ)を`ecr_repository_url`へpushし`-var image_tag=<sha>`で再apply、`frontend/dist`を`frontend_bucket_name`へ同期して`create-invalidation`する(CI/CD統合は[05](../docs/deliverables/architecture/05_cicd_devsecops_tobe.md)のとおり)
5. **2回目のapply**: 出力`cloudfront_domain_name`で`app_environment`の`FRONTEND_URL`/`CORS_ORIGINS`を更新して再applyする

## 意図的な暫定事項(解消条件つき)

- **CloudFront–ALB間がHTTP**: 独自ドメインとACM証明書の確定(06 Phase 0)後、ALBをHTTPSリスナーへ切り替える。それまでの平文区間はAWSネットワーク内に限られる(ALBはCloudFrontのorigin-facingプレフィックスリストのみ許可)
- **OIDCロールがAdministratorAccess**: 管理対象リソースが固まり次第、実際に使うアクションへ最小化する
- **DBスキーマ適用**: stagingでの初回は`alembic upgrade head`を手動のECSタスク実行(run-task)で行う。CI/CDへの組み込みはPhase 3
