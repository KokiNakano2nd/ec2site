output "state_bucket_name" {
  description = "environments/*/backend.tfへ設定するtfstateバケット名"
  value       = aws_s3_bucket.tfstate.bucket
}

output "github_actions_role_arn" {
  description = "GitHub ActionsのOIDC認証で引き受けるロールARN"
  value       = aws_iam_role.github_actions.arn
}
