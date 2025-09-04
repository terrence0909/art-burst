// src/awsConfig.js
const awsConfig = {
  // LEGACY STYLE - Add these top-level properties
  aws_project_region: 'us-east-1',
  aws_cognito_region: 'us-east-1',
  aws_user_pools_id: 'us-east-1_yI7aBwAHv',
  aws_user_pools_web_client_id: '7umintgt7opk611rtf4qc72pa4',
  
  // KEEP the modern format too for compatibility
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_yI7aBwAHv',
    userPoolWebClientId: '7umintgt7opk611rtf4qc72pa4',
    authenticationFlowType: 'USER_PASSWORD_AUTH'
  },
  API: {
    endpoints: [
      {
        name: 'artburst-api',
        endpoint: 'https://a43a4dtk0l.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1'
      }
    ]
  }
};

export default awsConfig;