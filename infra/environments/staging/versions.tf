terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # bootstrapで作成したバケット名へ置き換える(infra/README.md参照)。
  # use_lockfileによるS3ネイティブロックのためDynamoDBは使わない(06 §6)。
  backend "s3" {
    bucket       = "REPLACE_WITH_STATE_BUCKET_NAME"
    key          = "staging/terraform.tfstate"
    region       = "ap-northeast-1"
    use_lockfile = true
  }
}
