terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.31.0"  # Use a specific stable version
    }
  }
}

provider "aws" {
  region = "us-east-1"
  
}