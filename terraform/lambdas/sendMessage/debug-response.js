const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

async function debugResponse() {
  console.log('🔍 Debugging sendMessage response structure\n');
  
  const payload = {
    body: JSON.stringify({
      content: 'Debug test message',
      receiverId: 'test-user-123'
    }),
    requestContext: {
      authorizer: {
        claims: {
          sub: 'test-sender-456'
        }
      }
    }
  };
  
  try {
    const result = await lambda.invoke({
      FunctionName: 'artburst-sendMessage',
      Payload: JSON.stringify(payload)
    }).promise();
    
    console.log('📦 Raw Lambda Response:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n🔍 Parsed Payload:');
    const response = JSON.parse(result.Payload);
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n📋 Response Keys:');
    console.log(Object.keys(response));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugResponse();
