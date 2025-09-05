const awsConfig = {
  // Legacy style (for compatibility)
  aws_project_region: import.meta.env.VITE_AWS_REGION,
  aws_cognito_region: import.meta.env.VITE_AWS_REGION,
  aws_user_pools_id: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  aws_user_pools_web_client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,

  // Modern Amplify configuration
  Auth: {
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    authenticationFlowType: 'USER_PASSWORD_AUTH',
  },
  API: {
    endpoints: [
      {
        name: 'artburst-api',
        endpoint: import.meta.env.VITE_API_BASE_URL,
        region: import.meta.env.VITE_AWS_REGION,
      },
    ],
  },
  Storage: {
    AWSS3: {
      bucket: import.meta.env.VITE_S3_BUCKET,
      region: import.meta.env.VITE_AWS_REGION,
    },
  },
};

export default awsConfig;
