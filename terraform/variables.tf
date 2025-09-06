# -------------------------
# General
# -------------------------
variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

# -------------------------
# S3
# -------------------------
variable "s3_bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
  default     = "art-burst"
}

# -------------------------
# Cognito
# -------------------------
variable "cognito_user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
  default     = "artburst-user-pool"
}

variable "cognito_user_pool_client_name" {
  description = "Name of the Cognito User Pool Client"
  type        = string
  default     = "artburst-app-client"
}

variable "cognito_domain_prefix" {
  description = "Prefix for the Cognito hosted domain"
  type        = string
  default     = "artburst-auth"
}

# -------------------------
# DynamoDB
# -------------------------
variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for auctions"
  type        = string
  default     = "artburst-auctions"
}

# -------------------------
# API Gateway
# -------------------------
variable "api_gateway_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "artburst-api"
}
