# -------------------------
# S3 Bucket
# -------------------------
output "s3_bucket_name" {
  value       = aws_s3_bucket.art_burst.bucket
  description = "Name of the S3 bucket"
}

# -------------------------
# Cognito
# -------------------------
output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.artburst_user_pool.id
  description = "ID of the Cognito User Pool"
}

output "cognito_user_pool_client_id" {
  value       = aws_cognito_user_pool_client.artburst_user_pool_client.id
  description = "ID of the Cognito User Pool Client"
}

output "cognito_domain" {
  value       = aws_cognito_user_pool_domain.artburst_domain.domain
  description = "Cognito hosted domain prefix"
}

# -------------------------
# DynamoDB
# -------------------------
output "dynamodb_table_name" {
  value       = aws_dynamodb_table.auctions.name
  description = "DynamoDB Auctions table name"
}

# -------------------------
# API Gateway
# -------------------------
output "api_gateway_invoke_url" {
  value       = "${aws_api_gateway_deployment.artburst_deployment.invoke_url}/prod"
  description = "Base URL of the API Gateway deployment"
}

# -------------------------
# PayFast Webhook
# -------------------------
output "payfast_webhook_url" {
  value       = aws_lambda_function_url.payfast_webhook.function_url
  description = "PayFast webhook URL for ITN notifications"
}

output "payments_table_name" {
  value       = aws_dynamodb_table.payments.name
  description = "DynamoDB Payments table name"
}

output "payfast_lambda_function_name" {
  value       = aws_lambda_function.payfast_webhook.function_name
  description = "PayFast webhook Lambda function name"
}
