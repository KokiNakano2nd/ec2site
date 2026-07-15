variable "name_prefix" {
  description = "リソース名の接頭辞(例: ec2site-staging)"
  type        = string
}

variable "bucket_name" {
  description = "frontendビルド成果物を置くS3バケット名(グローバル一意)"
  type        = string
}

variable "alb_dns_name" {
  description = "`/api/*`の転送先となるALBのDNS名"
  type        = string
}

variable "domain_name" {
  description = "独自ドメイン(未確定のため既定は空。空のときはCloudFront既定ドメイン+既定証明書を使う)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "domain_name指定時に必須のACM証明書ARN(us-east-1)"
  type        = string
  default     = ""
}
