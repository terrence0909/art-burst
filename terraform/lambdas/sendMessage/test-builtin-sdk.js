const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

console.log('🧪 Testing WebSocketSubscribe with Built-in SDK\n');

async function testBuiltinSDK() {
  const receiverId = 'user-wjfk744q';
  const senderId = 'test-builtin-sender';
  
  console.log('👤 Receiver:', receiverId);
  console.log('👤 Sender:', senderId);
  console.log('');
  
  const testPayload = {
    action: 'newMessage',
    message: {
      messageId: 'test-builtin-' + Date.now(),
      conversationId: 'conv-builtin-' + Date.now(),
      senderId: senderId,
      receiverId: receiverId,
      content: '🔧 TEST: WebSocketSubscribe with built-in SDK',
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
    
    console.log('📦 Raw response status:', result.StatusCode);
    
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
        
        if (response.deliveredTo > 0) {
          console.log('   🚀 REAL-TIME MESSAGES ARE BEING DELIVERED!');
        }
      }
    }
  } catch (error) {
    console.log('❌ Invocation error:', error.message);
  }
}

// Wait a moment for the deployment to be ready
setTimeout(testBuiltinSDK, 5000);
