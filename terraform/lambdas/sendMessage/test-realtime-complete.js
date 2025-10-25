const AWS = require('aws-sdk');
const WebSocket = require('ws');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

console.log('🚀 Testing Complete Real-time Messaging Flow\n');

// Create test users
const receiverId = 'live-test-receiver-' + Math.random().toString(36).substr(2, 8);
const senderId = 'live-test-sender-' + Math.random().toString(36).substr(2, 8);

console.log('Receiver ID:', receiverId);
console.log('Sender ID:', senderId);
console.log('');

let messageReceived = false;

// Step 1: Connect receiver via WebSocket
console.log('1. 📡 Connecting receiver to WebSocket...');
const ws = new WebSocket(`wss://qm968tbs12.execute-api.us-east-1.amazonaws.com/prod?userId=${receiverId}`);

ws.on('open', async () => {
  console.log('   ✅ WebSocket connected');
  
  // Subscribe to messages
  ws.send(JSON.stringify({
    action: 'subscribe',
    userId: receiverId
  }));
  console.log('   ✅ Subscribed to messages');
  
  // Wait for subscription to register
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 2: Send message via sendMessage API
  console.log('\n2. ✉️  Sending message via sendMessage API...');
  
  const payload = {
    body: JSON.stringify({
      content: 'Hello! This is a real-time WebSocket test message! 🎉',
      receiverId: receiverId
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
    const result = await lambda.invoke({
      FunctionName: 'artburst-sendMessage',
      Payload: JSON.stringify(payload)
    }).promise();
    
    const lambdaResponse = JSON.parse(result.Payload);
    const body = JSON.parse(lambdaResponse.body);
    
    console.log('   ✅ Message sent via API');
    console.log('   📝 Message ID:', body.message.id);
    console.log('   💬 Content:', body.message.content);
    console.log('   🆔 Conversation:', body.conversationId);
    
  } catch (error) {
    console.log('   ❌ Error sending message:', error.message);
  }
});

ws.on('message', (data) => {
  const messageData = JSON.parse(data);
  console.log('\n3. 📨 WEBSOCKET MESSAGE RECEIVED!');
  console.log('   🔔 Action:', messageData.action);
  
  if (messageData.action === 'newMessage') {
    console.log('   💌 Content:', messageData.message.content);
    console.log('   👤 From:', messageData.message.senderId);
    console.log('   🕒 Time:', new Date().toLocaleTimeString());
    console.log('   🎉 SUCCESS: Real-time messaging is working!');
    messageReceived = true;
    
    // Close connection after success
    setTimeout(() => {
      ws.close();
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    }, 1000);
  }
});

ws.on('error', (error) => {
  console.log('   ❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('   🔌 WebSocket connection closed');
  if (!messageReceived) {
    console.log('\n⚠️  Message not received via WebSocket');
    console.log('💡 The sendMessage API worked, but WebSocket delivery needs checking');
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout reached');
  if (!messageReceived) {
    console.log('🔧 Possible issues:');
    console.log('   - WebSocketSubscribe function may need debugging');
    console.log('   - Check if WebSocketConnections table is being read correctly');
    console.log('   - Verify WebSocketSubscribe has proper permissions');
  }
  process.exit(0);
}, 15000);
