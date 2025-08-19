resource "aws_s3_bucket" "art_burst" {
  bucket = "art-burst"
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

# Cognito User Pool
resource "aws_cognito_user_pool" "artburst_user_pool" {
  name                     = "artburst-user-pool"
  auto_verified_attributes = ["email"]

  alias_attributes = ["email", "preferred_username"]

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
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
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

resource "aws_cognito_user_pool_client" "artburst_user_pool_client" {
  name         = "artburst-app-client"
  user_pool_id = aws_cognito_user_pool.artburst_user_pool.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
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

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows  = ["implicit", "code"]
  allowed_oauth_scopes = ["email", "openid", "profile"]
  callback_urls        = ["https://your-app-domain.com/callback"]
  logout_urls          = ["https://your-app-domain.com/logout"]
}

resource "aws_cognito_user_pool_domain" "artburst_domain" {
  domain       = "artburst-auth"
  user_pool_id = aws_cognito_user_pool.artburst_user_pool.id
}

# Modern IAM role configuration
resource "aws_iam_role" "lambda_exec_role" {
  name = "artburst_lambda_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [ {
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    } ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Cognito access policy
resource "aws_iam_role_policy" "lambda_cognito_access" {
  name = "lambda_cognito_access"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [ {
      Effect = "Allow"
      Action = [
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminRespondToAuthChallenge",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:AdminGetUser"
      ]
      Resource = aws_cognito_user_pool.artburst_user_pool.arn
    } ]
  })
}
