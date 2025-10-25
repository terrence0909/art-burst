const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

async function testWorking() {
  console.log('🧪 Testing sendMessage with correct response handling\n');
  
  const payload = {
    body: JSON.stringify({
      content: 'Working test message at ' + new Date().toLocaleTimeString(),
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
    console.log('📤 Invoking sendMessage...');
    const result = await lambda.invoke({
      FunctionName: 'artburst-sendMessage',
      Payload: JSON.stringify(payload)
    }).promise();
    
    // Parse the Lambda response
    const lambdaResponse = JSON.parse(result.Payload);
    
    // Parse the body from the Lambda response
    const body = JSON.parse(lambdaResponse.body);
    
    console.log('✅ SUCCESS! Message sent:');
    console.log('📨 Message ID:', body.message.id);
    console.log('💬 Content:', body.message.content);
    console.log('👤 Sender:', body.message.senderId);
    console.log('👥 Receiver:', body.message.receiverId);
    console.log('🆔 Conversation ID:', body.conversationId);
    console.log('🆕 New conversation:', body.createdNewConversation);
    
    console.log('\n🎉 sendMessage function is working perfectly!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testWorking();
