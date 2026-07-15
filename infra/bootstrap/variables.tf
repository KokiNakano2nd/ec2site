variable "aws_region" {
  description = "AWSリージョン(ADR-003/06_aws_deployment_tobe.mdで東京に確定)"
  type        = string
  default     = "ap-northeast-1"
}

variable "state_bucket_name" {
  description = "tfstate保存用S3バケット名(グローバル一意。例: ec2site-tfstate-<account_id>)"
  type        = string
}

variable "github_repository" {
  description = "OIDCで信頼するGitHubリポジトリ(owner/repo)"
  type        = string
  default     = "KokiNakano2nd/ec2site"
}
