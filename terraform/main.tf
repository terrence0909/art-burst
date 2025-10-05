# -------------------------
# S3 Bucket
# -------------------------
resource "aws_s3_bucket" "art_burst" {
  bucket = var.s3_bucket_name

  tags = {
    Name        = "ArtBurst Storage"
    Environment = "Production"
  }
}

resource "aws_s3_bucket_versioning" "art_burst_versioning" {
  bucket = aws_s3_bucket.art_burst.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "art_burst_encryption" {
  bucket = aws_s3_bucket.art_burst.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "art_burst_ownership" {
  bucket = aws_s3_bucket.art_burst.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "art_burst_access" {
  bucket                  = aws_s3_bucket.art_burst.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -------------------------
# S3 Bucket CORS Configuration
# -------------------------
resource "aws_s3_bucket_cors_configuration" "art_burst_cors" {
  bucket = aws_s3_bucket.art_burst.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "DELETE", "HEAD"]
    allowed_origins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
      "http://localhost:4173",
      "http://localhost:8080"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# -------------------------
# Cognito User Pool
# -------------------------
resource "aws_cognito_user_pool" "artburst_user_pool" {
  name                     = "artburst-user-pool"
  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  schema {
    name                = "given_name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "family_name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  mfa_configuration = "OFF"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your ArtBurst Verification Code"
    email_message        = "Your verification code is {####}"
  }
}

# -------------------------
# Cognito User Pool Client
# -------------------------
resource "aws_cognito_user_pool_client" "artburst_user_pool_client" {
  name         = "artburst-app-client"
  user_pool_id = aws_cognito_user_pool.artburst_user_pool.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"

  # Corrected token validity
  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = ["http://localhost:5173/", "https://your-production-domain.com/"]
  logout_urls                          = ["http://localhost:5173/logout", "https://your-production-domain.com/logout"]
  supported_identity_providers         = ["COGNITO"]
}

# -------------------------
# Cognito Domain
# -------------------------
resource "aws_cognito_user_pool_domain" "artburst_domain" {
  domain       = "artburst-auth"
  user_pool_id = aws_cognito_user_pool.artburst_user_pool.id
}

# -------------------------
# Cognito Identity Pool
# -------------------------
resource "aws_cognito_identity_pool" "artburst_identity_pool" {
  identity_pool_name                = "artburst_identity_pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.artburst_user_pool_client.id
    provider_name           = "cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.artburst_user_pool.id}"
    server_side_token_check = false
  }
}

# -------------------------
# IAM Role for Cognito Authenticated Users
# -------------------------
resource "aws_iam_role" "cognito_authenticated_role" {
  name = "ArtBurstCognitoAuthenticatedRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.artburst_identity_pool.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

# -------------------------
# IAM Policy for S3 Access
# -------------------------
resource "aws_iam_policy" "cognito_s3_access" {
  name        = "CognitoS3AccessPolicy"
  description = "Allows Cognito users to access S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${aws_s3_bucket.art_burst.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.art_burst.arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["*"]
          }
        }
      }
    ]
  })
}

# -------------------------
# Attach Policy to Role
# -------------------------
resource "aws_iam_role_policy_attachment" "cognito_s3_access" {
  role       = aws_iam_role.cognito_authenticated_role.name
  policy_arn = aws_iam_policy.cognito_s3_access.arn
}

# -------------------------
# Identity Pool Role Attachment
# -------------------------
resource "aws_cognito_identity_pool_roles_attachment" "artburst_roles" {
  identity_pool_id = aws_cognito_identity_pool.artburst_identity_pool.id

  roles = {
    "authenticated" = aws_iam_role.cognito_authenticated_role.arn
  }
}

# -------------------------
# DynamoDB Auctions Table - CORRECTED
# -------------------------
resource "aws_dynamodb_table" "auctions" {
  name         = "artburst-auctions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "auctionId"  # This matches your actual table

  attribute {
    name = "auctionId"  # Changed from "id" to "auctionId"
    type = "S"
  }

  attribute {
    name = "artistId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "ArtistIdIndex"
    hash_key        = "artistId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL"
  }

  tags = {
    Name = "ArtBurst Auctions Table"
  }
}

# -------------------------
# IAM Role for Lambda
# -------------------------
resource "aws_iam_role" "lambda_exec_role" {
  name = "artburst_lambda_exec_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name = "lambda_dynamodb_access"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.auctions.arn,
          "${aws_dynamodb_table.auctions.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_s3_access" {
  name = "lambda_s3_access"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion"  # Added for versioned buckets
        ]
        Resource = "${aws_s3_bucket.art_burst.arn}/*"
      },
      {
        Effect = "Allow"
        Action = "s3:ListBucket"
        Resource = aws_s3_bucket.art_burst.arn
      }
    ]
  })
}

# -------------------------
# Lambda Function (Updated for multiple endpoints)
# -------------------------
resource "aws_lambda_function" "create_auction" {
  function_name = "createAuction"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  filename         = "${path.module}/lambdas/createAuction.zip"  
  source_code_hash = filebase64sha256("${path.module}/lambdas/createAuction.zip")

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.auctions.name
      BUCKET_NAME = aws_s3_bucket.art_burst.bucket
    }
  }

  timeout = 30  # Increased timeout for image processing
}

# -------------------------
# API Gateway
# -------------------------
resource "aws_api_gateway_rest_api" "artburst_api" {
  name        = "artburst-api"
  description = "API for ArtBurst auctions"
}

resource "aws_api_gateway_resource" "auctions" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  parent_id   = aws_api_gateway_rest_api.artburst_api.root_resource_id
  path_part   = "auctions"
}

# -------------------------
# BID RESOURCE - NEW
# -------------------------
resource "aws_api_gateway_resource" "bid" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  parent_id   = aws_api_gateway_resource.auctions.id
  path_part   = "bid"
}

# -------------------------
# SINGLE AUCTION RESOURCE - NEW
# -------------------------
resource "aws_api_gateway_resource" "auction" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  parent_id   = aws_api_gateway_resource.auctions.id
  path_part   = "{id}"
}

# -------------------------
# METHODS
# -------------------------

# POST /auctions - Create auction
resource "aws_api_gateway_method" "create_auction_post" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.auctions.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"  # Changed from NONE to require auth
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# POST /auctions/bid - Place bid - NEW
resource "aws_api_gateway_method" "bid_post" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.bid.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

# GET /auctions - List all auctions
resource "aws_api_gateway_method" "auctions_get" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.auctions.id
  http_method   = "GET"
  authorization = "NONE"  # Public access for listing auctions
}

# GET /auctions/{id} - Get single auction - NEW
resource "aws_api_gateway_method" "auction_get" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.auction.id
  http_method   = "GET"
  authorization = "NONE"  # Public access for viewing auctions
}

# -------------------------
# INTEGRATIONS
# -------------------------

resource "aws_api_gateway_integration" "create_auction_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.auctions.id
  http_method             = aws_api_gateway_method.create_auction_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_auction.invoke_arn
}

resource "aws_api_gateway_integration" "bid_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.bid.id
  http_method             = aws_api_gateway_method.bid_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_auction.invoke_arn
}

resource "aws_api_gateway_integration" "auctions_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.auctions.id
  http_method             = aws_api_gateway_method.auctions_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_auction.invoke_arn
}

resource "aws_api_gateway_integration" "auction_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.auction.id
  http_method             = aws_api_gateway_method.auction_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_auction.invoke_arn
}

# -------------------------
# LAMBDA PERMISSIONS
# -------------------------

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_auction.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.artburst_api.execution_arn}/*/*"
}

# -------------------------
# COGNITO AUTHORizER - NEW
# -------------------------
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "CognitoAuthorizer"
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = [aws_cognito_user_pool.artburst_user_pool.arn]
}

# -------------------------
# API Gateway Deployment
# -------------------------
resource "aws_api_gateway_deployment" "artburst_deployment" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  depends_on  = [
    aws_api_gateway_integration.create_auction_integration,
    aws_api_gateway_integration.bid_integration,
    aws_api_gateway_integration.auctions_get_integration,
    aws_api_gateway_integration.auction_get_integration
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# -------------------------
# API Gateway Stage
# -------------------------
resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  deployment_id = aws_api_gateway_deployment.artburst_deployment.id
  stage_name    = "prod"
}

# -------------------------
# OPTIONS methods for CORS (for all endpoints)
# -------------------------

# OPTIONS /auctions
resource "aws_api_gateway_method" "auctions_options" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.auctions.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS /auctions/bid
resource "aws_api_gateway_method" "bid_options" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.bid.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# OPTIONS /auctions/{id}
resource "aws_api_gateway_method" "auction_options" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.auction.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integration responses for all OPTIONS methods
resource "aws_api_gateway_integration" "auctions_options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.auctions.id
  http_method             = aws_api_gateway_method.auctions_options.http_method
  type                    = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  passthrough_behavior = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_integration" "bid_options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.bid.id
  http_method             = aws_api_gateway_method.bid_options.http_method
  type                    = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  passthrough_behavior = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_integration" "auction_options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.artburst_api.id
  resource_id             = aws_api_gateway_resource.auction.id
  http_method             = aws_api_gateway_method.auction_options.http_method
  type                    = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  passthrough_behavior = "WHEN_NO_MATCH"
}

# Method responses for all OPTIONS methods
resource "aws_api_gateway_method_response" "options_response" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.auctions.id
  http_method = aws_api_gateway_method.auctions_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "bid_options_response" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.bid.id
  http_method = aws_api_gateway_method.bid_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_method_response" "auction_options_response" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.auction.id
  http_method = aws_api_gateway_method.auction_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Integration responses for all OPTIONS methods
resource "aws_api_gateway_integration_response" "options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.auctions.id
  http_method = aws_api_gateway_method.auctions_options.http_method
  status_code = aws_api_gateway_method_response.options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS,PUT,DELETE'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "bid_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.bid.id
  http_method = aws_api_gateway_method.bid_options.http_method
  status_code = aws_api_gateway_method_response.bid_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_integration_response" "auction_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.auction.id
  http_method = aws_api_gateway_method.auction_options.http_method
  status_code = aws_api_gateway_method_response.auction_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# -------------------------
# PayFast Webhook Lambda Function
# -------------------------
resource "aws_lambda_function" "payfast_webhook" {
  function_name = "payfast-webhook-handler"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  filename         = "${path.module}/lambdas/payfast-webhook/payfast-webhook.zip"
  source_code_hash = filebase64sha256("${path.module}/lambdas/payfast-webhook/payfast-webhook.zip")

  environment {
    variables = {
      TABLE_NAME           = aws_dynamodb_table.auctions.name
      PAYMENTS_TABLE       = "Payments"
      PAYFAST_MERCHANT_ID  = var.payfast_merchant_id
      PAYFAST_MERCHANT_KEY = var.payfast_merchant_key
      PAYFAST_PASSPHRASE   = var.payfast_passphrase
      PAYFAST_SANDBOX      = var.payfast_sandbox
    }
  }

  timeout = 30
}

# -------------------------
# Payments DynamoDB Table
# -------------------------
resource "aws_dynamodb_table" "payments" {
  name         = "Payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "paymentId"

  attribute {
    name = "paymentId"
    type = "S"
  }

  attribute {
    name = "auctionId"
    type = "S"
  }

  global_secondary_index {
    name            = "auctionId-index"
    hash_key        = "auctionId"
    projection_type = "ALL"
  }

  tags = {
    Name = "ArtBurst Payments Table"
  }
}

# -------------------------
# Lambda Function URL for PayFast Webhooks
# -------------------------
resource "aws_lambda_function_url" "payfast_webhook" {
  function_name      = aws_lambda_function.payfast_webhook.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["POST"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 0
  }
}

# -------------------------
# Lambda Permission for Function URL
# -------------------------
resource "aws_lambda_permission" "payfast_webhook_url" {
  statement_id  = "AllowPublicInvoke"
  action        = "lambda:InvokeFunctionUrl"
  function_name = aws_lambda_function.payfast_webhook.function_name
  principal     = "*"
  function_url_auth_type = "NONE"
}

# -------------------------
# Additional IAM Policy for Payments Table Access
# -------------------------
resource "aws_iam_role_policy" "lambda_payments_access" {
  name = "lambda_payments_access"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.payments.arn,
          "${aws_dynamodb_table.payments.arn}/index/*"
        ]
      }
    ]
  })
}