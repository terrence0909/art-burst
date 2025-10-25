const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

console.log('🚀 Testing Real-time Messaging (Simple Version)\n');

// Test the sendMessage function first
async function testSendMessage() {
  console.log('1. 📤 Testing sendMessage API...');
  
  const payload = {
    body: JSON.stringify({
      content: 'Real-time test at ' + new Date().toLocaleTimeString(),
      receiverId: 'test-receiver-123'
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
    
    const lambdaResponse = JSON.parse(result.Payload);
    const body = JSON.parse(lambdaResponse.body);
    
    console.log('   ✅ Message sent successfully!');
    console.log('   📨 Message ID:', body.message.id);
    console.log('   💬 Content:', body.message.content);
    console.log('   🆔 Conversation:', body.conversationId);
    
    console.log('\n2. 🔍 Checking WebSocket broadcast...');
    console.log('   The message should be broadcast via WebSocketSubscribe');
    console.log('   to any connected users with ID: test-receiver-123');
    
    // Check WebSocketConnections table for the receiver
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const connections = await dynamodb.query({
      TableName: 'WebSocketConnections',
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': 'test-receiver-123'
      }
    }).promise();
    
    console.log(`   📊 Found ${connections.Count} active WebSocket connections for receiver`);
    
    if (connections.Count > 0) {
      console.log('   ✅ Receiver has active WebSocket connections');
      console.log('   📡 Message should be delivered in real-time');
    } else {
      console.log('   ⚠️  No active WebSocket connections for receiver');
      console.log('   💡 Connect a WebSocket client with userId: test-receiver-123 to test real-time');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testSendMessage();
