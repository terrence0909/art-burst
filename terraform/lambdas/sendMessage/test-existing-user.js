const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

async function testWithExistingUser() {
  console.log('🧪 Testing sendMessage to existing connected user\n');
  
  // Use the user ID we saw in the connections table
  const existingUserId = 'user-wjfk744q';
  const senderId = 'test-sender-' + Math.random().toString(36).substr(2, 8);
  
  console.log('Sending to existing user:', existingUserId);
  console.log('From sender:', senderId);
  
  const payload = {
    body: JSON.stringify({
      content: 'Hello! This is a real-time test message at ' + new Date().toLocaleTimeString(),
      receiverId: existingUserId
    }),
    requestContext: {
      authorizer: {
        claims: {
          sub: senderId
        }
      }
    }
  };
  
  try {
    console.log('\n📤 Sending message via sendMessage API...');
    const result = await lambda.invoke({
      FunctionName: 'artburst-sendMessage',
      Payload: JSON.stringify(payload)
    }).promise();
    
    const response = JSON.parse(result.Payload);
    console.log('✅ API Response:');
    console.log('Success:', response.success);
    console.log('Message ID:', response.message?.id);
    console.log('Conversation ID:', response.conversationId);
    
    if (response.success) {
      console.log('\n🎉 Message sent successfully!');
      console.log('💡 Check if user-wjfk744q receives the message in real-time');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testWithExistingUser();
