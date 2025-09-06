// src/awsConfig.js
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
      region: import.meta.env.VITE_AWS_REGION,
    }
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_S3_BUCKET,
      region: import.meta.env.VITE_AWS_REGION,
    }
  },
  API: {
    REST: {
      endpoints: [
        {
          name: "artburst-api",
          endpoint: import.meta.env.VITE_API_BASE_URL,
          region: import.meta.env.VITE_AWS_REGION,
        }
      ]
    }
  }
};

export default awsConfig;