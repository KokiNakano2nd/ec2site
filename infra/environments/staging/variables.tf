variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "frontend_bucket_name" {
  description = "frontend配信用S3バケット名(グローバル一意。例: ec2site-staging-frontend-<account_id>)"
  type        = string
}

variable "image_tag" {
  description = "デプロイするbackendイメージのgit SHAタグ(CI/CDが指定する)"
  type        = string
  default     = "bootstrap"
}

variable "app_environment" {
  description = "backendの非機密環境変数(06 §5)。FRONTEND_URL/CORS_ORIGINSは初回apply後にCloudFrontドメインで更新する"
  type        = map(string)
  default = {
    APP_ENV        = "staging"
    LOG_LEVEL      = "INFO"
    EMAIL_DELIVERY = "console"
    STRIPE_ENABLED = "false"
    FRONTEND_URL   = "https://replace-after-first-apply.cloudfront.net"
    CORS_ORIGINS   = "https://replace-after-first-apply.cloudfront.net"
  }
}
