/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_AWS_REGION: string
  readonly VITE_S3_BUCKET: string
  readonly VITE_IDENTITY_POOL_ID: string
  readonly VITE_MOMENTO_AUTH_TOKEN: string
  readonly VITE_MOMENTO_CACHE_NAME: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_OPENCAGE_API_KEY: string
  readonly VITE_PAYFAST_MERCHANT_ID: string
  readonly VITE_PAYFAST_MERCHANT_KEY: string
  readonly VITE_PAYFAST_PASSPHRASE: string
  readonly VITE_PAYFAST_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}