const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

console.log('🧪 Testing CLEAN WebSocketSubscribe Function\n');

async function testCleanFunction() {
  const receiverId = 'user-wjfk744q';
  const senderId = 'test-clean-sender';
  
  console.log('👤 Receiver:', receiverId);
  console.log('👤 Sender:', senderId);
  console.log('');
  
  const testPayload = {
    action: 'newMessage',
    message: {
      messageId: 'test-clean-' + Date.now(),
      conversationId: 'conv-clean-' + Date.now(),
      senderId: senderId,
      receiverId: receiverId,
      content: '🧹 CLEAN TEST: Clean WebSocketSubscribe function',
      timestamp: new Date().toISOString(),
      read: false
    },
    receiverId: receiverId,
    senderId: senderId
  };
  
  try {
    console.log('📤 Invoking WebSocketSubscribe...');
    const result = await lambda.invoke({
      FunctionName: 'WebSocketSubscribe',
      Payload: JSON.stringify(testPayload)
    }).promise();
    
    if (result.FunctionError) {
      console.log('❌ Function error:', result.FunctionError);
      const errorDetails = JSON.parse(result.Payload);
      console.log('Error details:', JSON.stringify(errorDetails, null, 2));
    } else {
      const response = JSON.parse(result.Payload);
      console.log('✅ WebSocketSubscribe RESPONSE:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('🎉 SUCCESS: WebSocketSubscribe is working!');
        console.log('   Delivered to:', response.deliveredTo, 'connections');
        console.log('   Failed:', response.failed, 'connections');
        console.log('   Total:', response.totalConnections, 'connections');
      }
    }
  } catch (error) {
    console.log('❌ Invocation error:', error.message);
  }
}

testCleanFunction();
