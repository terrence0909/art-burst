// src/awsConfig.js
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_JK3CQ5pQn',
      userPoolClientId: '5retq05r1ij7id9v543sd4e5ud',
      loginWith: {
        oauth: {
          domain: 'artburst-auth.auth.us-east-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['http://localhost:8080'],
          redirectSignOut: ['http://localhost:8080'],
          responseType: 'code'
        },
        username: true, // Allow email/password login
      }
    }
  },
  Storage: {
    S3: {
      bucket: 'art-burst',
      region: 'us-east-1'
    }
  }
};

export default awsConfig;