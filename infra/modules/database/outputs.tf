output "endpoint" {
  description = "接続エンドポイント(host:port)"
  value       = aws_db_instance.this.endpoint
}

output "db_name" {
  value = aws_db_instance.this.db_name
}

output "master_user_secret_arn" {
  description = "RDS管理のマスター資格情報シークレット(username/passwordのJSON)"
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}

output "security_group_id" {
  value = aws_security_group.db.id
}
