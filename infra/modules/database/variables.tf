variable "name_prefix" {
  description = "リソース名の接頭辞(例: ec2site-staging)"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "db_subnet_ids" {
  description = "RDSサブネットグループ用のサブネット(2AZ以上必須)"
  type        = list(string)
}

variable "app_security_group_id" {
  description = "接続を許可するアプリ(ECSタスク)のセキュリティグループ"
  type        = string
}

variable "engine_version" {
  description = "PostgreSQLメジャーバージョン(ローカルのcompose.yamlと合わせる)"
  type        = string
  default     = "17"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "ec_site"
}

variable "master_username" {
  type    = string
  default = "ec_site"
}

variable "backup_retention_period" {
  description = "自動バックアップの保持日数(本番化ゲート6)"
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "productionではtrueにする"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "stagingのみtrueを許容する"
  type        = bool
  default     = false
}
