const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({});

exports.handler = async (event) => {
  console.log('Real SendMessage function started');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Access-Control-Allow-Origin': 'https://terrence0909.github.io',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,x-amz-security-token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return {
      statusCode: 200,
      headers: headers,
      body: ''
    };
  }

  // Handle POST request
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { conversationId, message, receiverId, test, isTest } = body;
      
      console.log('Body received:', { conversationId, message, receiverId, test, isTest });
      
      // Handle authentication - FIXED: Check if there's no requestContext (direct invoke)
      let senderId = event.requestContext?.authorizer?.claims?.sub;
      
      console.log('Initial senderId from authorizer:', senderId);
      console.log('Has requestContext:', !!event.requestContext);
      console.log('Has authorizer:', !!event.requestContext?.authorizer);
      
      // Test mode logic - allow when test=true OR when there's no requestContext (direct invoke)
      if (!senderId && (test === true || isTest === true || !event.requestContext)) {
        senderId = "test-user-" + Date.now();
        console.log('TEST MODE: Using test sender ID:', senderId);
      }
      
      console.log('Final senderId:', senderId);
      
      if (!conversationId || !message || !receiverId) {
        return {
          statusCode: 400,
          headers: headers,
          body: JSON.stringify({ 
            error: 'Missing required fields',
            required: ['conversationId', 'message', 'receiverId'],
            received: { conversationId, message, receiverId }
          })
        };
      }
      
      if (!senderId) {
        return {
          statusCode: 401,
          headers: headers,
          body: JSON.stringify({ 
            error: 'Missing authentication',
            message: 'Valid Cognito authentication required. Use test=true for testing.',
            debug: {
              hasRequestContext: !!event.requestContext,
              hasAuthorizer: !!event.requestContext?.authorizer,
              testFlag: test
            }
          })
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
        type: 'text',
        isTest: !!(test || isTest || !event.requestContext) // Mark test messages
      };
      
      // Only save to DynamoDB if we're not in test mode or table exists
      const isTestMode = test === true || isTest === true || !event.requestContext;
      
      if (process.env.MESSAGES_TABLE && !isTestMode) {
        await dynamodb.send(new PutCommand({
          TableName: process.env.MESSAGES_TABLE,
          Item: messageItem
        }));
        console.log('Message saved to database');
      } else if (isTestMode) {
        console.log('Test mode - skipping database save');
      } else {
        console.log('MESSAGES_TABLE not configured - skipping database save');
      }
      
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
          messageId: messageId,
          isTest: isTestMode
        }
      };
      
      // Save notification to DynamoDB (only if not in test mode)
      if (process.env.NOTIFICATIONS_TABLE && !isTestMode) {
        await dynamodb.send(new PutCommand({
          TableName: process.env.NOTIFICATIONS_TABLE,
          Item: notification
        }));
        console.log('NEW_MESSAGE notification created');
      } else if (isTestMode) {
        console.log('Test mode - skipping notification save');
      }
      
      // 3. Update conversation last message (only if not in test mode)
      if (process.env.CONVERSATIONS_TABLE && !isTestMode) {
        await dynamodb.send(new UpdateCommand({
          TableName: process.env.CONVERSATIONS_TABLE,
          Key: { conversationId },
          UpdateExpression: 'SET lastMessage = :lastMessage, lastMessageTimestamp = :timestamp',
          ExpressionAttributeValues: {
            ':lastMessage': message.substring(0, 100),
            ':timestamp': new Date().toISOString()
          }
        }));
        console.log('Conversation updated');
      } else if (isTestMode) {
        console.log('Test mode - skipping conversation update');
      }
      
      // 4. Call WebSocket function to broadcast (only if not in test mode)
      if (process.env.WEBSOCKET_FUNCTION && !isTestMode) {
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
      } else if (isTestMode) {
        console.log('Test mode - skipping WebSocket broadcast');
      }
      
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
          success: true,
          message: messageItem,
          notification: notification,
          mode: isTestMode ? 'test' : 'production'
        })
      };
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ 
          error: 'Internal server error',
          details: error.message
        })
      };
    }
  }
  
  // Handle other HTTP methods
  return {
    statusCode: 405,
    headers: headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};