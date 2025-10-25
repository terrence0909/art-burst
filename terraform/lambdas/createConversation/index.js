// terraform/lambdas/createConversation/index.js
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { participants, auctionId } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;
    
    // Validate participants includes current user
    if (!participants.includes(userId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Participants must include current user' })
      };
    }
    
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation = {
      conversationId,
      participants,
      auctionId: auctionId || null,
      createdAt: new Date().toISOString(),
      lastMessage: 'Conversation started',
      lastMessageTimestamp: new Date().toISOString()
    };
    
    await dynamodb.put({
      TableName: process.env.CONVERSATIONS_TABLE,
      Item: conversation
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ conversationId })
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};