variable "name_prefix" {
  description = "リソース名の接頭辞(例: ec2site-staging)"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "ALB用のpublicサブネット(2AZ以上)"
  type        = list(string)
}

variable "app_subnet_ids" {
  description = "ECSタスク用のprivateサブネット"
  type        = list(string)
}

variable "container_port" {
  type    = number
  default = 8001
}

variable "cpu" {
  description = "タスクCPU(Fargate単位)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "タスクメモリ(MiB)"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "初期は1タスク(06 §4)"
  type        = number
  default     = 1
}

variable "image_tag" {
  description = "デプロイするbackendイメージのタグ(git SHAで不変にする)"
  type        = string
  default     = "bootstrap"
}

variable "app_environment" {
  description = "非機密の環境変数(06 §5)。機密はsecret_namesのSecrets Manager経由で注入する"
  type        = map(string)
  default     = {}
}

variable "secret_names" {
  description = "Secrets Manager経由で注入する機密環境変数名(値はTerraform外でput-secret-valueする)"
  type        = list(string)
  default     = ["SECRET_KEY", "DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SMTP_USER", "SMTP_PASSWORD"]
}

variable "health_check_path" {
  description = "ALBターゲットグループのヘルスチェックパス"
  type        = string
  default     = "/products"
}

variable "log_retention_in_days" {
  type    = number
  default = 30
}
