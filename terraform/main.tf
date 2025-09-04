# -------------------------
# S3 Bucket for ArtBurst
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
  bucket = aws_s3_bucket.art_burst.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
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

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30
}

# -------------------------
# Cognito Domain
# -------------------------
resource "aws_cognito_user_pool_domain" "artburst_domain" {
  domain       = "artburst-auth"
  user_pool_id = aws_cognito_user_pool.artburst_user_pool.id
}

# -------------------------
# DynamoDB Auctions Table
# -------------------------
resource "aws_dynamodb_table" "auctions" {
  name         = "artburst-auctions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "auctionId"

  attribute {
    name = "auctionId"
    type = "S"
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
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.auctions.arn
      }
    ]
  })
}

# -------------------------
# Lambda Function (Create Auction)
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
      TABLE_NAME = aws_dynamodb_table.auctions.name
    }
  }
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

resource "aws_api_gateway_method" "create_auction_post" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  resource_id   = aws_api_gateway_resource.auctions.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "create_auction_integration" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  resource_id = aws_api_gateway_resource.auctions.id
  http_method = aws_api_gateway_method.create_auction_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_auction.invoke_arn
}

resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_auction.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.artburst_api.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "artburst_deployment" {
  rest_api_id = aws_api_gateway_rest_api.artburst_api.id
  depends_on  = [aws_api_gateway_integration.create_auction_integration]
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.artburst_api.id
  deployment_id = aws_api_gateway_deployment.artburst_deployment.id
  stage_name    = "prod"
}
