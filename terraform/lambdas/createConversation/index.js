const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://terrence0909.github.io',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
    'Access-Control-Allow-Credentials': 'true'
  };

  try {
    const { participants, auctionId } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;
    
    if (!participants.includes(userId)) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: 'Participants must include current user' })
      };
    }
    
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const participantsString = participants.sort().join(',');
    
    const conversation = {
      conversationId,
      participants: participantsString,
      participantList: participants,
      auctionId: auctionId || null,
      createdAt: timestamp,
      lastMessage: 'Conversation started',
      lastMessageTimestamp: timestamp
    };
    
    await dynamodb.put({
      TableName: process.env.CONVERSATIONS_TABLE,
      Item: conversation
    }).promise();
    
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ 
        conversationId,
        participants: participants
      })
    };
    
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
