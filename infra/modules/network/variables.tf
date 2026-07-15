variable "name_prefix" {
  description = "リソース名の接頭辞(例: ec2site-staging)"
  type        = string
}

variable "vpc_cidr" {
  description = "VPCのCIDR"
  type        = string
  default     = "10.0.0.0/16"
}
