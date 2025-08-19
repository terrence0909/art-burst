output "s3_bucket_name" {
  value       = aws_s3_bucket.art_burst.bucket
  description = "Name of the S3 bucket"
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.artburst_user_pool.id
  description = "ID of the Cognito User Pool"
}

output "cognito_user_pool_client_id" {
  value       = aws_cognito_user_pool_client.artburst_user_pool_client.id
  description = "ID of the Cognito User Pool Client"
}
