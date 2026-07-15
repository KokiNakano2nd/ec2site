provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ec2site"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "ec2site-production"
}

module "network" {
  source = "../../modules/network"

  name_prefix = local.name_prefix
}

module "backend_app" {
  source = "../../modules/backend_app"

  name_prefix       = local.name_prefix
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  app_subnet_ids    = module.network.app_subnet_ids
  image_tag         = var.image_tag
  app_environment   = var.app_environment
}

module "database" {
  source = "../../modules/database"

  name_prefix           = local.name_prefix
  vpc_id                = module.network.vpc_id
  db_subnet_ids         = module.network.db_subnet_ids
  app_security_group_id = module.backend_app.app_security_group_id

  # productionは誤削除を防ぎ、削除時は最終スナップショットを必ず取る
  deletion_protection = true
  skip_final_snapshot = false
}

module "frontend" {
  source = "../../modules/frontend"

  name_prefix  = local.name_prefix
  bucket_name  = var.frontend_bucket_name
  alb_dns_name = module.backend_app.alb_dns_name
}
