const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

console.log('🧪 Testing DEPLOYED WebSocketSubscribe Function\n');

async function testDeployedFunction() {
  const receiverId = 'user-wjfk744q';
  const senderId = 'test-deployed-sender';
  
  console.log('👤 Receiver:', receiverId);
  console.log('👤 Sender:', senderId);
  console.log('');
  
  const testPayload = {
    action: 'newMessage',
    message: {
      messageId: 'test-deployed-' + Date.now(),
      conversationId: 'conv-deployed-' + Date.now(),
      senderId: senderId,
      receiverId: receiverId,
      content: '✅ TEST: Deployed WebSocketSubscribe function working!',
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
    
    console.log('📦 Raw response:', JSON.stringify(result, null, 2));
    
    if (result.FunctionError) {
      console.log('❌ Function error:', result.FunctionError);
      const errorDetails = JSON.parse(result.Payload);
      console.log('Error details:', JSON.stringify(errorDetails, null, 2));
    } else {
      const response = JSON.parse(result.Payload);
      console.log('✅ WebSocketSubscribe SUCCESS:');
      console.log('   Success:', response.success);
      console.log('   Delivered to:', response.deliveredTo, 'connections');
      console.log('   Failed:', response.failed, 'connections');
      console.log('   Total connections:', response.totalConnections);
      
      if (response.deliveredTo > 0) {
        console.log('   🎉 REAL-TIME MESSAGES ARE BEING DELIVERED!');
        console.log('   💡 User', receiverId, 'should see the message in real-time');
      } else {
        console.log('   ℹ️  No active connections found for delivery');
        console.log('   💡 Make sure WebSocket clients are connected with userId:', receiverId);
      }
    }
  } catch (error) {
    console.log('❌ Invocation error:', error.message);
  }
}

testDeployedFunction();
