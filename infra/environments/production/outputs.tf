output "cloudfront_domain_name" {
  description = "配信URL(この値でapp_environmentのFRONTEND_URL/CORS_ORIGINSを更新する)"
  value       = module.frontend.distribution_domain_name
}

output "cloudfront_distribution_id" {
  value = module.frontend.distribution_id
}

output "frontend_bucket_name" {
  value = module.frontend.bucket_name
}

output "ecr_repository_url" {
  value = module.backend_app.ecr_repository_url
}

output "alb_dns_name" {
  value = module.backend_app.alb_dns_name
}

output "ecs_cluster_name" {
  value = module.backend_app.cluster_name
}

output "ecs_service_name" {
  value = module.backend_app.service_name
}

output "db_endpoint" {
  value = module.database.endpoint
}

output "db_master_user_secret_arn" {
  description = "RDS管理のマスター資格情報。DATABASE_URLシークレットの組み立てに使う"
  value       = module.database.master_user_secret_arn
}

output "app_secret_arns" {
  description = "値の設定(put-secret-value)が必要なシークレット一覧"
  value       = module.backend_app.secret_arns
}
