// Use the built-in AWS SDK v3 for Node.js 18.x
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

// Initialize clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({});

exports.handler = async (event) => {
  console.log('Real SendMessage function started');
  
  const headers = {
    'Access-Control-Allow-Origin': 'https://terrence0909.github.io',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    const body = JSON.parse(event.body);
    const { conversationId, message, receiverId } = body;
    const senderId = event.requestContext.authorizer.claims.sub;
    
    if (!conversationId || !message || !receiverId) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // 1. Save the message to DynamoDB
    const messageId = `msg_${Date.now()}`;
    const messageItem = {
      messageId,
      conversationId,
      senderId,
      receiverId,
      content: message,
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    await dynamodb.send(new PutCommand({
      TableName: process.env.MESSAGES_TABLE,
      Item: messageItem
    }));
    
    console.log('Message saved to database');
    
    // 2. Create NEW_MESSAGE notification for the receiver
    const notification = {
      notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'NEW_MESSAGE',
      title: 'New Message',
      message: `You have a new message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      userId: receiverId,
      relatedId: conversationId,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        conversationId,
        senderId,
        messagePreview: message.substring(0, 100),
        messageId: messageId
      }
    };
    
    // Save notification to DynamoDB
    if (process.env.NOTIFICATIONS_TABLE) {
      await dynamodb.send(new PutCommand({
        TableName: process.env.NOTIFICATIONS_TABLE,
        Item: notification
      }));
      console.log('NEW_MESSAGE notification created');
    }
    
    // 3. Update conversation last message
    await dynamodb.send(new UpdateCommand({
      TableName: process.env.CONVERSATIONS_TABLE,
      Key: { conversationId },
      UpdateExpression: 'SET lastMessage = :lastMessage, lastMessageTimestamp = :timestamp',
      ExpressionAttributeValues: {
        ':lastMessage': message.substring(0, 100),
        ':timestamp': new Date().toISOString()
      }
    }));
    
    // 4. Call WebSocket function to broadcast
    await lambdaClient.send(new InvokeCommand({
      FunctionName: process.env.WEBSOCKET_FUNCTION,
      InvocationType: 'Event',
      Payload: JSON.stringify({
        action: 'newMessage',
        message: messageItem,
        receiverId: receiverId,
        senderId: senderId
      })
    }));
    
    console.log('WebSocket broadcast triggered');
    
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: messageItem,
        notification: notification
      })
    };
    
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};