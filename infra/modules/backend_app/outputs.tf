output "alb_dns_name" {
  description = "CloudFrontのAPIオリジンに指定するALBのDNS名"
  value       = aws_lb.this.dns_name
}

output "ecr_repository_url" {
  description = "CI/CDがイメージをpushするECRリポジトリURL"
  value       = aws_ecr_repository.backend.repository_url
}

output "app_security_group_id" {
  description = "databaseモジュールへ渡すECSタスクのセキュリティグループ"
  value       = aws_security_group.app.id
}

output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_name" {
  value = aws_ecs_service.backend.name
}

output "secret_arns" {
  description = "値の設定(put-secret-value)が必要なシークレットのARN"
  value       = { for name, secret in aws_secretsmanager_secret.app : name => secret.arn }
}
