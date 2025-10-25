const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

async function testWebSocketSubscribe() {
  console.log('🔍 Testing WebSocketSubscribe function\n');
  
  // Test data that sendMessage would send
  const testPayload = {
    action: 'newMessage',
    message: {
      messageId: 'test-msg-' + Date.now(),
      conversationId: 'test-conv-123',
      senderId: 'test-sender-456',
      receiverId: 'test-receiver-123',
      content: 'Test WebSocket broadcast',
      timestamp: new Date().toISOString(),
      read: false
    },
    receiverId: 'test-receiver-123',
    senderId: 'test-sender-456'
  };
  
  try {
    console.log('Invoking WebSocketSubscribe...');
    const result = await lambda.invoke({
      FunctionName: 'WebSocketSubscribe',
      Payload: JSON.stringify(testPayload)
    }).promise();
    
    console.log('✅ WebSocketSubscribe invoked successfully');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Check if there was any error
    if (result.FunctionError) {
      console.log('❌ Function error:', result.FunctionError);
    } else {
      const response = JSON.parse(result.Payload);
      console.log('📊 Broadcast result:', response);
    }
    
  } catch (error) {
    console.log('❌ Error invoking WebSocketSubscribe:', error.message);
  }
}

testWebSocketSubscribe();
