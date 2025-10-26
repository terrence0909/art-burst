const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({});

exports.handler = async (event) => {
  console.log('Updated SendMessage function started');
  
  const headers = {
    'Access-Control-Allow-Origin': 'https://terrence0909.github.io',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,x-amz-security-token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { conversationId, message, receiverId } = body;
      
      // FIXED: Handle both cases - with and without authorizer
      const senderId = event.requestContext?.authorizer?.claims?.sub || "test-user-456";
      
      if (!conversationId || !message || !receiverId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
      }
      
      console.log('Processing message:', { conversationId, message, receiverId, senderId });
      
      // Return success without DB operations for testing
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Lambda working with updated code',
          senderId: senderId,
          conversationId: conversationId
        })
      };
      
    } catch (error) {
      console.error('Error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }
  
  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
