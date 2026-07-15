output "distribution_domain_name" {
  description = "配信URL(独自ドメイン確定まではこのドメインを使う)"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "distribution_id" {
  description = "デプロイ後のキャッシュ無効化(create-invalidation)に使う"
  value       = aws_cloudfront_distribution.this.id
}

output "bucket_name" {
  description = "CI/CDがfrontend/distを同期するバケット"
  value       = aws_s3_bucket.frontend.bucket
}
